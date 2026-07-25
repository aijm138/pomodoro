import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  DurationDraft,
  PomodoroProfile,
  PomodoroSettings,
  TimerMode,
  WorkSessionProjection,
} from '@/types/pomodoro'
import {
  BACKGROUND_PRESETS,
  createDefaultProfile,
  DEFAULT_BG,
  DEFAULT_SETTINGS,
  LONG_BREAK_RANGE,
  MAX_SESSIONS,
  SESSIONS_RANGE,
  SHORT_BREAK_RANGE,
  WORK_MINUTES_RANGE,
} from '@/constants/pomodoro'
import {
  disposeAudio,
  playCompletionSound,
  playGoingOffSound,
  startTickingSound,
  stopTickingSound,
  unlockAudio,
} from '@/utils/audio'
import { formatClockTime, formatTime } from '@/utils/formatTime'
import { isValidHex, normalizeHexInput } from '@/utils/color'
import {
  createProfileId,
  loadPersistedState,
  normalizeSessionNotes,
  sanitizeProfiles,
  savePersistedState,
} from '@/utils/storage'

/**
 * Core Pomodoro timer logic:
 * - Drift-resistant countdown via end-timestamp (works when minimized)
 * - Web Worker ticks as a backup when the main thread is throttled
 * - Work → short break → … → long break cycle (breaks of 0 min are skipped)
 * - localStorage persistence (including running end time)
 * - Named profiles for durations + session notes
 * - Optional ticking / going-off / completion MP3 sounds
 */
export function usePomodoro() {
  const settings = ref<PomodoroSettings>({ ...DEFAULT_SETTINGS })
  const mode = ref<TimerMode>('work')
  const completedInCycle = ref(0)
  const remainingSeconds = ref(DEFAULT_SETTINGS.workMinutes * 60)
  const isRunning = ref(false)
  /** Planned focus text for each work session (length = sessionsBeforeLongBreak) */
  const sessionNotes = ref<string[]>(
    normalizeSessionNotes([], DEFAULT_SETTINGS.sessionsBeforeLongBreak),
  )

  const profiles = ref<PomodoroProfile[]>([createDefaultProfile()])
  const activeProfileId = ref<string | null>(profiles.value[0]?.id ?? null)

  const menuOpen = ref(false)
  const showDurationsModal = ref(false)
  const showBackgroundModal = ref(false)
  const showProfilesModal = ref(false)
  const durationsError = ref('')
  const profilesError = ref('')
  const draft = ref<DurationDraft>({
    workMinutes: DEFAULT_SETTINGS.workMinutes,
    shortBreakMinutes: DEFAULT_SETTINGS.shortBreakMinutes,
    longBreakMinutes: DEFAULT_SETTINGS.longBreakMinutes,
    sessionsBeforeLongBreak: DEFAULT_SETTINGS.sessionsBeforeLongBreak,
  })
  /** Draft name when creating a new profile */
  const newProfileName = ref('')

  /** Absolute end time (ms) while running — survives tab throttle / minimize */
  let endTimestamp: number | null = null
  /** Main-thread fallback interval (also used if Worker unavailable) */
  let tickIntervalId: number | null = null
  /** Dedicated worker for more reliable background ticks */
  let timerWorker: Worker | null = null
  /** Prevent double-handling complete from worker + interval racing */
  let completing = false

  /**
   * Wall-clock tick so sessionBreakdown stays accurate while paused
   * (e.g. user waits several minutes before pressing Start again).
   * While running, remainingSeconds already updates ~4×/s so this is optional.
   */
  const nowMs = ref(Date.now())
  let nowTickId: number | null = null

  function startNowTick(): void {
    if (nowTickId !== null) return
    nowTickId = window.setInterval(() => {
      nowMs.value = Date.now()
    }, 15_000)
  }

  function stopNowTick(): void {
    if (nowTickId !== null) {
      clearInterval(nowTickId)
      nowTickId = null
    }
  }

  // ----- Computed -----

  const isBreak = computed(() => mode.value !== 'work')

  const modeLabel = computed(() => {
    if (mode.value === 'work') return 'Focus'
    if (mode.value === 'shortBreak') return 'Short break'
    return 'Long break'
  })

  const modeBadgeClass = computed(() => {
    if (mode.value === 'work') {
      return 'bg-tomato-500/25 text-tomato-200 border border-tomato-400/30'
    }
    if (mode.value === 'shortBreak') {
      return 'bg-break/20 text-break-light border border-break/40'
    }
    return 'bg-break-dark/40 text-break-light border border-break/50'
  })

  const displayTime = computed(() => formatTime(remainingSeconds.value))

  /** Skip always on breaks; on work only if setting allows */
  const canSkip = computed(() => {
    if (mode.value !== 'work') return true
    return settings.value.allowSkipWork
  })

  const activeProfile = computed(() => {
    const id = activeProfileId.value
    if (!id) return null
    return profiles.value.find((p) => p.id === id) ?? null
  })

  /**
   * Which work-session note is "current" (0-based).
   * -1 when on a break (no work session active).
   */
  const activeSessionIndex = computed(() => {
    if (mode.value !== 'work') return -1
    return Math.min(
      completedInCycle.value,
      Math.max(0, settings.value.sessionsBeforeLongBreak - 1),
    )
  })

  /**
   * Projected wall-clock end for every work session in the current cycle,
   * assuming the user runs every work + break back-to-back with no extra gaps.
   *
   * - Past sessions → "done"
   * - Current / future → "ends 3:42 PM" (locale default)
   *
   * Always derived from the live remainingSeconds so it stays accurate while
   * paused, after a late Start click, after Skip, or after duration edits.
   * Zero-minute breaks contribute no time between work sessions.
   */
  const sessionBreakdown = computed((): WorkSessionProjection[] => {
    const N = settings.value.sessionsBeforeLongBreak
    const k = Math.min(Math.max(0, completedInCycle.value), N)
    const workSec = settings.value.workMinutes * 60
    const shortSec = settings.value.shortBreakMinutes * 60
    // Long break is not needed for work-end projections (work ends before it).

    // Depend on nowMs so this computed re-evaluates while paused (15s tick).
    // Always use a fresh Date.now() for the actual anchor so running ticks
    // (which update remainingSeconds) stay accurate even if nowMs is slightly stale.
    void nowMs.value
    const anchorMs = Date.now() + Math.max(0, remainingSeconds.value) * 1000

    const results: WorkSessionProjection[] = []

    // Past work sessions are already finished.
    for (let i = 0; i < k; i++) {
      results.push({
        index: i,
        endsAt: null,
        isDone: true,
        isCurrent: false,
        display: 'done',
      })
    }

    // Entire cycle of work is finished (on / after long break).
    if (k >= N) {
      return results
    }

    // Remaining work indices: k … N-1
    // Build absolute end times for each remaining work session.
    const endMsByIndex = new Map<number, number>()

    if (mode.value === 'work') {
      // Current work k ends at anchor; then short break + full work for the rest.
      endMsByIndex.set(k, anchorMs)
      let t = anchorMs
      for (let i = k + 1; i < N; i++) {
        t += shortSec * 1000 // break after previous work (0 if disabled)
        t += workSec * 1000 // full next work
        endMsByIndex.set(i, t)
      }
    } else if (mode.value === 'shortBreak') {
      // Short break ends at anchor, then full work k, then (short + work)…
      let t = anchorMs
      for (let i = k; i < N; i++) {
        t += workSec * 1000
        endMsByIndex.set(i, t)
        if (i < N - 1) {
          t += shortSec * 1000
        }
      }
    } else {
      // longBreak: cycle work is already done (handled by k >= N above).
      // Defensive: if somehow k < N on long break, treat remaining as full chain
      // starting after this long break (shouldn't normally happen).
      let t = anchorMs
      for (let i = k; i < N; i++) {
        t += workSec * 1000
        endMsByIndex.set(i, t)
        if (i < N - 1) {
          t += shortSec * 1000
        }
      }
    }

    for (let i = k; i < N; i++) {
      const endMs = endMsByIndex.get(i)
      if (endMs === undefined) {
        results.push({
          index: i,
          endsAt: null,
          isDone: false,
          isCurrent: mode.value === 'work' && i === k,
          display: '—',
        })
        continue
      }
      const endsAt = new Date(endMs)
      results.push({
        index: i,
        endsAt,
        isDone: false,
        isCurrent: mode.value === 'work' && i === k,
        display: `ends ${formatClockTime(endsAt)}`,
      })
    }

    return results
  })

  // ----- Duration helpers -----

  function durationForMode(m: TimerMode): number {
    const s = settings.value
    if (m === 'work') return s.workMinutes * 60
    if (m === 'shortBreak') return s.shortBreakMinutes * 60
    return s.longBreakMinutes * 60
  }

  // ----- Sound sync (ticking loops only while running + enabled) -----

  function shouldPlayTicking(): boolean {
    if (!isRunning.value || !settings.value.tickingSoundEnabled) return false
    if (mode.value === 'work') return true
    return settings.value.tickingDuringBreaks
  }

  function syncTickingSound(): void {
    if (shouldPlayTicking()) {
      startTickingSound()
    } else {
      stopTickingSound()
    }
  }

  /**
   * Sounds when a countdown hits zero:
   * - Work session: going-off alarm (`pomodoro_clock_going_off.mp3`)
   * - Final work session of the cycle: completion jingle
   *   (`trw_lesson_complete_sound.mp3`) — always after going-off so it isn’t cut off
   * - Breaks: silent (user starts the next phase manually)
   */
  function playSessionEndSounds(completedMode: TimerMode): void {
    stopTickingSound()

    if (completedMode !== 'work') return

    const isCycleComplete =
      completedInCycle.value + 1 >= settings.value.sessionsBeforeLongBreak

    if (settings.value.goingOffSoundEnabled) {
      playGoingOffSound()
    }

    if (isCycleComplete && settings.value.completionSoundEnabled) {
      // Slight delay so the going-off clip can start first without muting this one
      window.setTimeout(() => {
        playCompletionSound()
      }, settings.value.goingOffSoundEnabled ? 400 : 0)
    }
  }

  // ----- Persistence -----

  function persist(): void {
    savePersistedState({
      settings: settings.value,
      mode: mode.value,
      completedInCycle: completedInCycle.value,
      remainingSeconds: remainingSeconds.value,
      sessionNotes: sessionNotes.value,
      isRunning: isRunning.value,
      endTimestamp: isRunning.value ? endTimestamp : null,
      profiles: profiles.value,
      activeProfileId: activeProfileId.value,
    })
  }

  function hydrateFromStorage(): void {
    const data = loadPersistedState()
    if (!data) {
      // First launch — seed a default profile from defaults
      profiles.value = [createDefaultProfile()]
      activeProfileId.value = profiles.value[0]?.id ?? null
      return
    }

    if (data.settings) {
      settings.value = data.settings
    }

    if (typeof data.completedInCycle === 'number') {
      completedInCycle.value = data.completedInCycle
    }

    if (data.mode) {
      mode.value = data.mode
    }

    sessionNotes.value = normalizeSessionNotes(
      data.sessionNotes ?? [],
      settings.value.sessionsBeforeLongBreak,
    )

    if (data.profiles && data.profiles.length > 0) {
      profiles.value = data.profiles
    } else {
      profiles.value = sanitizeProfiles(
        null,
        settings.value,
        sessionNotes.value,
      )
    }

    if (
      typeof data.activeProfileId === 'string' &&
      profiles.value.some((p) => p.id === data.activeProfileId)
    ) {
      activeProfileId.value = data.activeProfileId
    } else {
      activeProfileId.value = profiles.value[0]?.id ?? null
    }

    // Resume a timer that was running when the page was closed/minimized
    const savedEnd =
      typeof data.endTimestamp === 'number' ? data.endTimestamp : null
    const wasRunning = Boolean(data.isRunning) && savedEnd !== null

    if (wasRunning && savedEnd !== null) {
      const msLeft = savedEnd - Date.now()
      if (msLeft <= 0) {
        // Session finished while away — land on the next phase, paused
        remainingSeconds.value = 0
        endTimestamp = null
        isRunning.value = false
        // Apply completion side-effects once (sounds + advance)
        const finishedMode = mode.value
        playSessionEndSounds(finishedMode)
        advanceAfterSession()
      } else {
        remainingSeconds.value = Math.max(1, Math.ceil(msLeft / 1000))
        endTimestamp = savedEnd
        isRunning.value = true
        // start engine without rewriting endTimestamp
        startEngine(false)
      }
      return
    }

    if (typeof data.remainingSeconds === 'number' && data.remainingSeconds > 0) {
      remainingSeconds.value = Math.min(
        data.remainingSeconds,
        durationForMode(mode.value),
      )
    } else {
      remainingSeconds.value = durationForMode(mode.value)
    }

    // If we hydrated onto a 0-minute break, skip it immediately
    skipZeroDurationBreakIfNeeded()
  }

  /** Keep notes array length aligned with sessions-before-long-break */
  function resizeSessionNotes(count: number): void {
    sessionNotes.value = normalizeSessionNotes(sessionNotes.value, count)
  }

  function saveSessionNotes(notes: string[]): void {
    sessionNotes.value = normalizeSessionNotes(
      notes,
      settings.value.sessionsBeforeLongBreak,
    )
    // Keep active profile's notes in sync when user saves breakdown
    syncActiveProfileFromCurrent()
  }

  watch(
    [
      settings,
      mode,
      completedInCycle,
      remainingSeconds,
      sessionNotes,
      profiles,
      activeProfileId,
    ],
    () => persist(),
    { deep: true },
  )

  // When the user changes how many work sessions are in a cycle, resize notes
  watch(
    () => settings.value.sessionsBeforeLongBreak,
    (count) => {
      resizeSessionNotes(count)
    },
  )

  // Keep tick audio aligned with run state + mode + toggles
  watch(
    [
      isRunning,
      mode,
      () => settings.value.tickingSoundEnabled,
      () => settings.value.tickingDuringBreaks,
    ],
    () => syncTickingSound(),
  )

  // ----- Timer engine -----

  function ensureWorker(): Worker | null {
    if (timerWorker) return timerWorker
    if (typeof Worker === 'undefined') return null
    try {
      timerWorker = new Worker(
        new URL('../workers/timerWorker.ts', import.meta.url),
        { type: 'module' },
      )
      timerWorker.onmessage = () => {
        if (isRunning.value) syncFromEndTimestamp()
      }
      timerWorker.onerror = () => {
        // Fall back to main-thread interval only
        try {
          timerWorker?.terminate()
        } catch {
          /* optional */
        }
        timerWorker = null
      }
      return timerWorker
    } catch {
      timerWorker = null
      return null
    }
  }

  function clearTick(): void {
    if (tickIntervalId !== null) {
      clearInterval(tickIntervalId)
      tickIntervalId = null
    }
    try {
      timerWorker?.postMessage({ type: 'stop' })
    } catch {
      /* optional */
    }
  }

  function syncFromEndTimestamp(): void {
    if (endTimestamp === null || completing) return
    const msLeft = endTimestamp - Date.now()
    const secs = Math.max(0, Math.ceil(msLeft / 1000))
    remainingSeconds.value = secs
    if (secs <= 0) {
      onTimerComplete()
    }
  }

  /**
   * @param resetEnd When true, compute a fresh end from remainingSeconds.
   *                 When false, keep the existing endTimestamp (resume path).
   */
  function startEngine(resetEnd = true): void {
    clearTick()
    if (resetEnd || endTimestamp === null) {
      endTimestamp = Date.now() + remainingSeconds.value * 1000
    }
    // Main-thread interval (UI + fallback)
    tickIntervalId = window.setInterval(syncFromEndTimestamp, 250)
    // Worker ticks for better background reliability
    const worker = ensureWorker()
    worker?.postMessage({ type: 'start' })
    syncFromEndTimestamp()
    syncTickingSound()
    persist()
  }

  function stopTicking(): void {
    if (endTimestamp !== null && isRunning.value) {
      const secs = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000))
      remainingSeconds.value = secs
    }
    endTimestamp = null
    clearTick()
    stopTickingSound()
  }

  function toggleRunning(): void {
    if (isRunning.value) {
      stopTicking()
      isRunning.value = false
      persist()
      return
    }

    // Must run play() in this user-gesture stack for browsers to allow audio
    unlockAudio()

    // Don't start a 0-duration break — advance instead
    if (mode.value !== 'work' && durationForMode(mode.value) <= 0) {
      advanceAfterSession()
      return
    }

    if (remainingSeconds.value <= 0) {
      remainingSeconds.value = durationForMode(mode.value)
    }
    if (remainingSeconds.value <= 0) {
      advanceAfterSession()
      return
    }

    isRunning.value = true
    startEngine(true)
    // Explicit call keeps tick start on the same click call stack
    if (shouldPlayTicking()) {
      startTickingSound()
    }
  }

  /**
   * If current mode is a break with 0 minutes, skip forward to the next
   * meaningful phase (work). Used after duration edits and hydrate.
   */
  function skipZeroDurationBreakIfNeeded(): void {
    // Guard against infinite loops (shouldn't happen with valid settings)
    let guard = 0
    while (mode.value !== 'work' && durationForMode(mode.value) <= 0 && guard < 4) {
      advanceAfterSession()
      guard += 1
    }
  }

  /**
   * Advance cycle when countdown hits 0.
   * Work complete → fill a progress dot, then short or long break
   *   (or skip the break entirely when duration is 0).
   * Long break complete → reset dots and start work.
   */
  function advanceAfterSession(): void {
    if (mode.value === 'work') {
      const nextCompleted = completedInCycle.value + 1
      completedInCycle.value = nextCompleted

      if (nextCompleted >= settings.value.sessionsBeforeLongBreak) {
        if (settings.value.longBreakMinutes <= 0) {
          // No long break — start a fresh cycle on work
          completedInCycle.value = 0
          mode.value = 'work'
        } else {
          mode.value = 'longBreak'
        }
      } else if (settings.value.shortBreakMinutes <= 0) {
        // No short break — go straight to next work session
        mode.value = 'work'
      } else {
        mode.value = 'shortBreak'
      }
    } else if (mode.value === 'longBreak') {
      completedInCycle.value = 0
      mode.value = 'work'
    } else {
      mode.value = 'work'
    }

    remainingSeconds.value = durationForMode(mode.value)

    // Chain-skip if we landed on another zero-duration break
    if (mode.value !== 'work' && remainingSeconds.value <= 0) {
      advanceAfterSession()
    }
  }

  function onTimerComplete(): void {
    if (completing) return
    completing = true
    try {
      const finishedMode = mode.value
      stopTicking()
      isRunning.value = false
      playSessionEndSounds(finishedMode)
      // Move to the next phase but wait for the user to press Start
      advanceAfterSession()
      persist()
    } finally {
      completing = false
    }
  }

  function skipSession(): void {
    if (!canSkip.value) return
    unlockAudio()
    stopTicking()
    isRunning.value = false
    // Skip is silent (no going-off alarm)
    advanceAfterSession()
  }

  function resetCycle(): void {
    stopTicking()
    isRunning.value = false
    mode.value = 'work'
    completedInCycle.value = 0
    remainingSeconds.value = durationForMode('work')
  }

  // ----- Settings -----

  function toggleAllowSkipWork(): void {
    settings.value = {
      ...settings.value,
      allowSkipWork: !settings.value.allowSkipWork,
    }
  }

  function toggleTickingSound(): void {
    unlockAudio()
    settings.value = {
      ...settings.value,
      tickingSoundEnabled: !settings.value.tickingSoundEnabled,
    }
  }

  function toggleTickingDuringBreaks(): void {
    unlockAudio()
    settings.value = {
      ...settings.value,
      tickingDuringBreaks: !settings.value.tickingDuringBreaks,
    }
  }

  function toggleGoingOffSound(): void {
    unlockAudio()
    settings.value = {
      ...settings.value,
      goingOffSoundEnabled: !settings.value.goingOffSoundEnabled,
    }
  }

  function toggleCompletionSound(): void {
    unlockAudio()
    settings.value = {
      ...settings.value,
      completionSoundEnabled: !settings.value.completionSoundEnabled,
    }
  }

  /**
   * Quick-edit work session count from the settings dropdown.
   * Clamps to 1–12, resizes notes, and resets the cycle timer.
   */
  function setSessionsBeforeLongBreak(raw: number | string): void {
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    const count = Math.min(
      SESSIONS_RANGE.max,
      Math.max(SESSIONS_RANGE.min, Math.round(n)),
    )
    if (count === settings.value.sessionsBeforeLongBreak) return

    const wasRunning = isRunning.value
    stopTicking()
    isRunning.value = false

    settings.value = {
      ...settings.value,
      sessionsBeforeLongBreak: count,
    }

    if (completedInCycle.value > count) {
      completedInCycle.value = count
    }

    resizeSessionNotes(count)

    // If we were mid-cycle past the new length, land on work fresh
    if (completedInCycle.value >= count && mode.value === 'work') {
      // stay; user finished the cycle's work
    }

    remainingSeconds.value = durationForMode(mode.value)
    skipZeroDurationBreakIfNeeded()
    syncActiveProfileFromCurrent()

    if (wasRunning && remainingSeconds.value > 0) {
      isRunning.value = true
      startEngine(true)
    }
  }

  function openDurationsModal(): void {
    menuOpen.value = false
    draft.value = {
      workMinutes: settings.value.workMinutes,
      shortBreakMinutes: settings.value.shortBreakMinutes,
      longBreakMinutes: settings.value.longBreakMinutes,
      sessionsBeforeLongBreak: settings.value.sessionsBeforeLongBreak,
    }
    durationsError.value = ''
    showDurationsModal.value = true
  }

  function closeDurationsModal(): void {
    showDurationsModal.value = false
    durationsError.value = ''
  }

  function saveDurations(): void {
    const w = Number(draft.value.workMinutes)
    const sb = Number(draft.value.shortBreakMinutes)
    const lb = Number(draft.value.longBreakMinutes)
    const n = Number(draft.value.sessionsBeforeLongBreak)

    if (!Number.isFinite(w) || w < WORK_MINUTES_RANGE.min) {
      durationsError.value = `Work must be at least ${WORK_MINUTES_RANGE.min} minute.`
      return
    }
    if (!Number.isFinite(sb) || sb < SHORT_BREAK_RANGE.min) {
      durationsError.value = 'Short break must be 0 or more (0 = no break).'
      return
    }
    if (!Number.isFinite(lb) || lb < LONG_BREAK_RANGE.min) {
      durationsError.value = 'Long break must be 0 or more (0 = no break).'
      return
    }
    if (!Number.isFinite(n) || n < SESSIONS_RANGE.min) {
      durationsError.value = `Sessions must be at least ${SESSIONS_RANGE.min}.`
      return
    }
    if (
      w > WORK_MINUTES_RANGE.max ||
      sb > SHORT_BREAK_RANGE.max ||
      lb > LONG_BREAK_RANGE.max ||
      n > SESSIONS_RANGE.max
    ) {
      durationsError.value = 'One or more values are out of range.'
      return
    }

    const wasRunning = isRunning.value
    stopTicking()
    isRunning.value = false

    settings.value = {
      ...settings.value,
      workMinutes: Math.round(w),
      shortBreakMinutes: Math.round(sb),
      longBreakMinutes: Math.round(lb),
      sessionsBeforeLongBreak: Math.round(n),
    }

    if (completedInCycle.value > settings.value.sessionsBeforeLongBreak) {
      completedInCycle.value = settings.value.sessionsBeforeLongBreak
    }

    resizeSessionNotes(settings.value.sessionsBeforeLongBreak)
    remainingSeconds.value = durationForMode(mode.value)
    skipZeroDurationBreakIfNeeded()
    syncActiveProfileFromCurrent()
    closeDurationsModal()

    if (wasRunning && remainingSeconds.value > 0) {
      isRunning.value = true
      startEngine(true)
    }
  }

  function openBackgroundModal(): void {
    menuOpen.value = false
    showBackgroundModal.value = true
  }

  function closeBackgroundModal(): void {
    showBackgroundModal.value = false
  }

  function setBackground(hex: string): void {
    if (!isValidHex(hex)) return
    settings.value = {
      ...settings.value,
      backgroundColor: hex.toLowerCase(),
    }
  }

  function onBackgroundLive(event: Event): void {
    const target = event.target as HTMLInputElement
    setBackground(target.value)
  }

  function onBackgroundHex(event: Event): void {
    const target = event.target as HTMLInputElement
    const v = normalizeHexInput(target.value)
    if (isValidHex(v)) setBackground(v)
  }

  // ----- Profiles -----

  /** Snapshot current durations + notes into the active profile (if any) */
  function syncActiveProfileFromCurrent(): void {
    const id = activeProfileId.value
    if (!id) return
    const idx = profiles.value.findIndex((p) => p.id === id)
    if (idx === -1) return

    const updated: PomodoroProfile = {
      ...profiles.value[idx]!,
      workMinutes: settings.value.workMinutes,
      shortBreakMinutes: settings.value.shortBreakMinutes,
      longBreakMinutes: settings.value.longBreakMinutes,
      sessionsBeforeLongBreak: settings.value.sessionsBeforeLongBreak,
      sessionNotes: normalizeSessionNotes(
        sessionNotes.value,
        settings.value.sessionsBeforeLongBreak,
      ),
    }

    const next = [...profiles.value]
    next[idx] = updated
    profiles.value = next
  }

  function openProfilesModal(): void {
    menuOpen.value = false
    profilesError.value = ''
    newProfileName.value = ''
    showProfilesModal.value = true
  }

  function closeProfilesModal(): void {
    showProfilesModal.value = false
    profilesError.value = ''
    newProfileName.value = ''
  }

  /**
   * Apply a profile's durations + notes and reset the cycle to work.
   * Sound/background prefs are left unchanged.
   */
  function applyProfile(profile: PomodoroProfile): void {
    stopTicking()
    isRunning.value = false

    settings.value = {
      ...settings.value,
      workMinutes: profile.workMinutes,
      shortBreakMinutes: profile.shortBreakMinutes,
      longBreakMinutes: profile.longBreakMinutes,
      sessionsBeforeLongBreak: profile.sessionsBeforeLongBreak,
    }

    sessionNotes.value = normalizeSessionNotes(
      profile.sessionNotes,
      profile.sessionsBeforeLongBreak,
    )

    mode.value = 'work'
    completedInCycle.value = 0
    remainingSeconds.value = durationForMode('work')
    activeProfileId.value = profile.id
  }

  function switchProfile(id: string): void {
    const profile = profiles.value.find((p) => p.id === id)
    if (!profile) {
      profilesError.value = 'Profile not found.'
      return
    }
    if (id === activeProfileId.value) {
      // Still re-apply so user can "reload" the saved snapshot
      applyProfile(profile)
      profilesError.value = ''
      return
    }

    // Save current config into the outgoing profile first
    syncActiveProfileFromCurrent()
    applyProfile(profile)
    profilesError.value = ''
  }

  /**
   * Save current durations + notes as a new named profile and select it.
   */
  function createProfileFromCurrent(name?: string): void {
    const trimmed = (name ?? newProfileName.value).trim()
    if (!trimmed) {
      profilesError.value = 'Enter a name for the new profile.'
      return
    }
    if (trimmed.length > 40) {
      profilesError.value = 'Name must be 40 characters or fewer.'
      return
    }
    if (
      profiles.value.some(
        (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      profilesError.value = 'A profile with that name already exists.'
      return
    }

    // Persist outgoing active profile first
    syncActiveProfileFromCurrent()

    const profile: PomodoroProfile = {
      id: createProfileId(),
      name: trimmed,
      workMinutes: settings.value.workMinutes,
      shortBreakMinutes: settings.value.shortBreakMinutes,
      longBreakMinutes: settings.value.longBreakMinutes,
      sessionsBeforeLongBreak: settings.value.sessionsBeforeLongBreak,
      sessionNotes: normalizeSessionNotes(
        sessionNotes.value,
        settings.value.sessionsBeforeLongBreak,
      ),
    }

    profiles.value = [...profiles.value, profile]
    activeProfileId.value = profile.id
    newProfileName.value = ''
    profilesError.value = ''
  }

  /**
   * Overwrite the active profile with the current live config
   * (durations + session notes). Useful after tweaking without switching.
   */
  function saveCurrentToActiveProfile(): void {
    if (!activeProfileId.value) {
      profilesError.value = 'No active profile to update.'
      return
    }
    syncActiveProfileFromCurrent()
    profilesError.value = ''
  }

  function renameProfile(id: string, name: string): void {
    const trimmed = name.trim()
    if (!trimmed) {
      profilesError.value = 'Name cannot be empty.'
      return
    }
    if (trimmed.length > 40) {
      profilesError.value = 'Name must be 40 characters or fewer.'
      return
    }
    if (
      profiles.value.some(
        (p) => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      profilesError.value = 'A profile with that name already exists.'
      return
    }

    const idx = profiles.value.findIndex((p) => p.id === id)
    if (idx === -1) {
      profilesError.value = 'Profile not found.'
      return
    }

    const next = [...profiles.value]
    next[idx] = { ...next[idx]!, name: trimmed }
    profiles.value = next
    profilesError.value = ''
  }

  function deleteProfile(id: string): void {
    if (profiles.value.length <= 1) {
      profilesError.value = 'Keep at least one profile.'
      return
    }

    const next = profiles.value.filter((p) => p.id !== id)
    if (next.length === profiles.value.length) {
      profilesError.value = 'Profile not found.'
      return
    }

    profiles.value = next

    if (activeProfileId.value === id) {
      const fallback = next[0]!
      applyProfile(fallback)
    }

    profilesError.value = ''
  }

  // ----- Document title + keyboard -----

  watch([displayTime, isRunning, modeLabel], () => {
    const prefix = isRunning.value ? '▶' : '❚❚'
    document.title = `${prefix} ${displayTime.value} · ${modeLabel.value} · Pomodoro`
  })

  function onKeydown(e: KeyboardEvent): void {
    if (e.code !== 'Space') return
    const target = e.target as HTMLElement | null
    const tag = target?.tagName ?? ''
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target?.isContentEditable
    ) {
      return
    }
    if (
      showDurationsModal.value ||
      showBackgroundModal.value ||
      showProfilesModal.value
    ) {
      return
    }
    e.preventDefault()
    toggleRunning()
  }

  function onVisibilityChange(): void {
    nowMs.value = Date.now()
    // Always re-sync from wall-clock end time when returning (or while hidden)
    if (isRunning.value && endTimestamp !== null) {
      syncFromEndTimestamp()
      persist()
    }
    // Keep trying to play tick audio when allowed; browsers may mute in bg
    syncTickingSound()
  }

  function onPageShow(): void {
    nowMs.value = Date.now()
    if (isRunning.value && endTimestamp !== null) {
      syncFromEndTimestamp()
    }
  }

  function onWindowFocus(): void {
    nowMs.value = Date.now()
    if (isRunning.value && endTimestamp !== null) {
      syncFromEndTimestamp()
    }
  }

  onMounted(() => {
    hydrateFromStorage()
    if (!isRunning.value && remainingSeconds.value <= 0) {
      remainingSeconds.value = durationForMode(mode.value)
      skipZeroDurationBreakIfNeeded()
    }
    nowMs.value = Date.now()
    startNowTick()
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('focus', onWindowFocus)
  })

  onUnmounted(() => {
    // Snapshot running state before tearing down so a refresh can resume
    if (isRunning.value) persist()
    clearTick()
    stopNowTick()
    try {
      timerWorker?.terminate()
    } catch {
      /* optional */
    }
    timerWorker = null
    disposeAudio()
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pageshow', onPageShow)
    window.removeEventListener('focus', onWindowFocus)
  })

  return {
    DEFAULT_BG,
    BACKGROUND_PRESETS,
    MAX_SESSIONS,
    settings,
    mode,
    completedInCycle,
    remainingSeconds,
    isRunning,
    sessionNotes,
    activeSessionIndex,
    sessionBreakdown,
    profiles,
    activeProfileId,
    activeProfile,
    menuOpen,
    showDurationsModal,
    showBackgroundModal,
    showProfilesModal,
    durationsError,
    profilesError,
    draft,
    newProfileName,
    isBreak,
    modeLabel,
    modeBadgeClass,
    displayTime,
    canSkip,
    toggleRunning,
    skipSession,
    resetCycle,
    toggleAllowSkipWork,
    toggleTickingSound,
    toggleTickingDuringBreaks,
    toggleGoingOffSound,
    toggleCompletionSound,
    setSessionsBeforeLongBreak,
    openDurationsModal,
    closeDurationsModal,
    saveDurations,
    openBackgroundModal,
    closeBackgroundModal,
    setBackground,
    onBackgroundLive,
    onBackgroundHex,
    openProfilesModal,
    closeProfilesModal,
    switchProfile,
    createProfileFromCurrent,
    saveCurrentToActiveProfile,
    renameProfile,
    deleteProfile,
    saveSessionNotes,
  }
}
