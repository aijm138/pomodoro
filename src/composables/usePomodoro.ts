import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  DurationDraft,
  PomodoroSettings,
  TimerMode,
} from '@/types/pomodoro'
import {
  BACKGROUND_PRESETS,
  DEFAULT_BG,
  DEFAULT_SETTINGS,
} from '@/constants/pomodoro'
import {
  disposeAudio,
  playGoingOffSound,
  startTickingSound,
  stopTickingSound,
  unlockAudio,
} from '@/utils/audio'
import { formatTime } from '@/utils/formatTime'
import { isValidHex, normalizeHexInput } from '@/utils/color'
import {
  loadPersistedState,
  normalizeSessionNotes,
  savePersistedState,
} from '@/utils/storage'

/**
 * Core Pomodoro timer logic:
 * - Drift-resistant countdown via end-timestamp
 * - Work → short break → … → long break cycle
 * - localStorage persistence
 * - Optional ticking + going-off MP3 sounds
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

  const menuOpen = ref(false)
  const showDurationsModal = ref(false)
  const showBackgroundModal = ref(false)
  const durationsError = ref('')
  const draft = ref<DurationDraft>({
    workMinutes: DEFAULT_SETTINGS.workMinutes,
    shortBreakMinutes: DEFAULT_SETTINGS.shortBreakMinutes,
    longBreakMinutes: DEFAULT_SETTINGS.longBreakMinutes,
    sessionsBeforeLongBreak: DEFAULT_SETTINGS.sessionsBeforeLongBreak,
  })

  /** Absolute end time (ms) while running — avoids setInterval drift */
  let endTimestamp: number | null = null
  let tickIntervalId: number | null = null

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

  // ----- Duration helpers -----

  function durationForMode(m: TimerMode): number {
    const s = settings.value
    if (m === 'work') return s.workMinutes * 60
    if (m === 'shortBreak') return s.shortBreakMinutes * 60
    return s.longBreakMinutes * 60
  }

  // ----- Sound sync (ticking loops only while running + enabled) -----

  function syncTickingSound(): void {
    if (isRunning.value && settings.value.tickingSoundEnabled) {
      startTickingSound()
    } else {
      stopTickingSound()
    }
  }

  function playAlarmIfEnabled(): void {
    if (settings.value.goingOffSoundEnabled) {
      playGoingOffSound()
    } else {
      stopTickingSound()
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
    })
  }

  function hydrateFromStorage(): void {
    const data = loadPersistedState()
    if (!data) return

    if (data.settings) {
      settings.value = data.settings
    }

    if (typeof data.completedInCycle === 'number') {
      completedInCycle.value = data.completedInCycle
    }

    if (data.mode) {
      mode.value = data.mode
    }

    if (typeof data.remainingSeconds === 'number' && data.remainingSeconds > 0) {
      remainingSeconds.value = Math.min(
        data.remainingSeconds,
        durationForMode(mode.value),
      )
    } else {
      remainingSeconds.value = durationForMode(mode.value)
    }

    sessionNotes.value = normalizeSessionNotes(
      data.sessionNotes ?? [],
      settings.value.sessionsBeforeLongBreak,
    )
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
  }

  watch(
    [settings, mode, completedInCycle, remainingSeconds, sessionNotes],
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

  // Keep tick audio aligned with run state + toggle
  watch(
    [isRunning, () => settings.value.tickingSoundEnabled],
    () => syncTickingSound(),
  )

  // ----- Timer engine -----

  function clearTick(): void {
    if (tickIntervalId !== null) {
      clearInterval(tickIntervalId)
      tickIntervalId = null
    }
  }

  function syncFromEndTimestamp(): void {
    if (endTimestamp === null) return
    const msLeft = endTimestamp - Date.now()
    const secs = Math.max(0, Math.ceil(msLeft / 1000))
    remainingSeconds.value = secs
    if (secs <= 0) {
      onTimerComplete()
    }
  }

  function startTicking(): void {
    clearTick()
    endTimestamp = Date.now() + remainingSeconds.value * 1000
    tickIntervalId = window.setInterval(syncFromEndTimestamp, 250)
    syncFromEndTimestamp()
    syncTickingSound()
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
      return
    }

    // Must run play() in this user-gesture stack for browsers to allow audio
    unlockAudio()

    if (remainingSeconds.value <= 0) {
      remainingSeconds.value = durationForMode(mode.value)
    }
    isRunning.value = true
    startTicking()
    // Explicit call keeps tick start on the same click call stack
    if (settings.value.tickingSoundEnabled) {
      startTickingSound()
    }
  }

  /**
   * Advance cycle when countdown hits 0.
   * Work complete → fill a progress dot, then short or long break.
   * Long break complete → reset dots and start work.
   */
  function advanceAfterSession(): void {
    if (mode.value === 'work') {
      const nextCompleted = completedInCycle.value + 1
      completedInCycle.value = nextCompleted

      if (nextCompleted >= settings.value.sessionsBeforeLongBreak) {
        mode.value = 'longBreak'
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
  }

  function onTimerComplete(): void {
    stopTicking()
    isRunning.value = false
    playAlarmIfEnabled()
    advanceAfterSession()
    // Auto-start next segment for seamless flow
    isRunning.value = true
    startTicking()
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

  function toggleGoingOffSound(): void {
    unlockAudio()
    settings.value = {
      ...settings.value,
      goingOffSoundEnabled: !settings.value.goingOffSoundEnabled,
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

    if (![w, sb, lb, n].every((x) => Number.isFinite(x) && x > 0)) {
      durationsError.value = 'All values must be positive numbers.'
      return
    }
    if (w > 180 || sb > 60 || lb > 90 || n > 12) {
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
    closeDurationsModal()

    if (wasRunning) {
      isRunning.value = true
      startTicking()
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
    if (showDurationsModal.value || showBackgroundModal.value) return
    e.preventDefault()
    toggleRunning()
  }

  function onVisibilityChange(): void {
    if (!document.hidden && isRunning.value && endTimestamp !== null) {
      syncFromEndTimestamp()
    }
    // Pause tick audio in background tabs to be polite; resume on return
    if (document.hidden) {
      stopTickingSound()
    } else {
      syncTickingSound()
    }
  }

  onMounted(() => {
    hydrateFromStorage()
    if (remainingSeconds.value <= 0) {
      remainingSeconds.value = durationForMode(mode.value)
    }
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    stopTicking()
    disposeAudio()
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    DEFAULT_BG,
    BACKGROUND_PRESETS,
    settings,
    mode,
    completedInCycle,
    remainingSeconds,
    isRunning,
    sessionNotes,
    activeSessionIndex,
    menuOpen,
    showDurationsModal,
    showBackgroundModal,
    durationsError,
    draft,
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
    toggleGoingOffSound,
    openDurationsModal,
    closeDurationsModal,
    saveDurations,
    openBackgroundModal,
    closeBackgroundModal,
    setBackground,
    onBackgroundLive,
    onBackgroundHex,
    saveSessionNotes,
  }
}
