import type {
  PersistedState,
  PomodoroProfile,
  PomodoroSettings,
  TimerMode,
} from '@/types/pomodoro'
import { clamp } from '@/utils/clamp'
import { isValidHex } from '@/utils/color'
import {
  createDefaultProfile,
  DEFAULT_BG,
  DEFAULT_SETTINGS,
  LONG_BREAK_RANGE,
  MAX_SESSIONS,
  SESSIONS_RANGE,
  SHORT_BREAK_RANGE,
  STORAGE_KEY,
  WORK_MINUTES_RANGE,
} from '@/constants/pomodoro'

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'work' || value === 'shortBreak' || value === 'longBreak'
}

function sanitizeSettings(raw: Partial<PomodoroSettings> | undefined): PomodoroSettings {
  const s = raw ?? {}
  return {
    workMinutes: clamp(
      s.workMinutes,
      WORK_MINUTES_RANGE.min,
      WORK_MINUTES_RANGE.max,
      DEFAULT_SETTINGS.workMinutes,
    ),
    shortBreakMinutes: clamp(
      s.shortBreakMinutes,
      SHORT_BREAK_RANGE.min,
      SHORT_BREAK_RANGE.max,
      DEFAULT_SETTINGS.shortBreakMinutes,
    ),
    longBreakMinutes: clamp(
      s.longBreakMinutes,
      LONG_BREAK_RANGE.min,
      LONG_BREAK_RANGE.max,
      DEFAULT_SETTINGS.longBreakMinutes,
    ),
    sessionsBeforeLongBreak: clamp(
      s.sessionsBeforeLongBreak,
      SESSIONS_RANGE.min,
      SESSIONS_RANGE.max,
      DEFAULT_SETTINGS.sessionsBeforeLongBreak,
    ),
    allowSkipWork: Boolean(s.allowSkipWork),
    // Default ON when missing (first load / older saved state)
    tickingSoundEnabled:
      typeof s.tickingSoundEnabled === 'boolean'
        ? s.tickingSoundEnabled
        : DEFAULT_SETTINGS.tickingSoundEnabled,
    tickingDuringBreaks:
      typeof s.tickingDuringBreaks === 'boolean'
        ? s.tickingDuringBreaks
        : DEFAULT_SETTINGS.tickingDuringBreaks,
    goingOffSoundEnabled:
      typeof s.goingOffSoundEnabled === 'boolean'
        ? s.goingOffSoundEnabled
        : DEFAULT_SETTINGS.goingOffSoundEnabled,
    completionSoundEnabled:
      typeof s.completionSoundEnabled === 'boolean'
        ? s.completionSoundEnabled
        : DEFAULT_SETTINGS.completionSoundEnabled,
    backgroundColor: isValidHex(s.backgroundColor)
      ? s.backgroundColor.toLowerCase()
      : DEFAULT_BG,
  }
}

/**
 * Normalize session notes to exactly `count` strings.
 * Truncates extras; pads missing slots with empty strings.
 */
export function normalizeSessionNotes(
  raw: unknown,
  count: number,
): string[] {
  const size = Math.max(1, Math.min(MAX_SESSIONS, Math.floor(count)))
  const source = Array.isArray(raw) ? raw : []
  const notes: string[] = []
  for (let i = 0; i < size; i++) {
    const value = source[i]
    notes.push(typeof value === 'string' ? value : '')
  }
  return notes
}

function sanitizeProfile(raw: unknown): PomodoroProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<PomodoroProfile>
  if (typeof p.id !== 'string' || !p.id.trim()) return null
  if (typeof p.name !== 'string' || !p.name.trim()) return null

  const sessionsBeforeLongBreak = clamp(
    p.sessionsBeforeLongBreak,
    SESSIONS_RANGE.min,
    SESSIONS_RANGE.max,
    DEFAULT_SETTINGS.sessionsBeforeLongBreak,
  )

  return {
    id: p.id.trim(),
    name: p.name.trim().slice(0, 40),
    workMinutes: clamp(
      p.workMinutes,
      WORK_MINUTES_RANGE.min,
      WORK_MINUTES_RANGE.max,
      DEFAULT_SETTINGS.workMinutes,
    ),
    shortBreakMinutes: clamp(
      p.shortBreakMinutes,
      SHORT_BREAK_RANGE.min,
      SHORT_BREAK_RANGE.max,
      DEFAULT_SETTINGS.shortBreakMinutes,
    ),
    longBreakMinutes: clamp(
      p.longBreakMinutes,
      LONG_BREAK_RANGE.min,
      LONG_BREAK_RANGE.max,
      DEFAULT_SETTINGS.longBreakMinutes,
    ),
    sessionsBeforeLongBreak,
    sessionNotes: normalizeSessionNotes(p.sessionNotes, sessionsBeforeLongBreak),
  }
}

/** Sanitize profile list; ensure at least one default profile exists */
export function sanitizeProfiles(
  raw: unknown,
  fallbackSettings?: PomodoroSettings,
  fallbackNotes?: string[],
): PomodoroProfile[] {
  const list = Array.isArray(raw) ? raw : []
  const cleaned: PomodoroProfile[] = []
  const seen = new Set<string>()

  for (const item of list) {
    const profile = sanitizeProfile(item)
    if (!profile || seen.has(profile.id)) continue
    seen.add(profile.id)
    cleaned.push(profile)
  }

  if (cleaned.length === 0) {
    const base = createDefaultProfile()
    if (fallbackSettings) {
      cleaned.push({
        ...base,
        workMinutes: fallbackSettings.workMinutes,
        shortBreakMinutes: fallbackSettings.shortBreakMinutes,
        longBreakMinutes: fallbackSettings.longBreakMinutes,
        sessionsBeforeLongBreak: fallbackSettings.sessionsBeforeLongBreak,
        sessionNotes: normalizeSessionNotes(
          fallbackNotes ?? [],
          fallbackSettings.sessionsBeforeLongBreak,
        ),
      })
    } else {
      cleaned.push(base)
    }
  }

  return cleaned
}

/** Load and validate persisted state from localStorage */
export function loadPersistedState(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const data = JSON.parse(raw) as Partial<PersistedState>
    const settings = sanitizeSettings(data.settings)

    const result: Partial<PersistedState> = { settings }

    if (typeof data.completedInCycle === 'number') {
      result.completedInCycle = clamp(
        data.completedInCycle,
        0,
        settings.sessionsBeforeLongBreak,
        0,
      )
    }

    if (isTimerMode(data.mode)) {
      result.mode = data.mode
    }

    if (typeof data.remainingSeconds === 'number' && data.remainingSeconds > 0) {
      result.remainingSeconds = Math.floor(data.remainingSeconds)
    }

    result.sessionNotes = normalizeSessionNotes(
      data.sessionNotes,
      settings.sessionsBeforeLongBreak,
    )

    if (typeof data.isRunning === 'boolean') {
      result.isRunning = data.isRunning
    }

    if (
      typeof data.endTimestamp === 'number' &&
      Number.isFinite(data.endTimestamp) &&
      data.endTimestamp > 0
    ) {
      result.endTimestamp = data.endTimestamp
    } else if (data.endTimestamp === null) {
      result.endTimestamp = null
    }

    const profiles = sanitizeProfiles(
      data.profiles,
      settings,
      result.sessionNotes,
    )
    result.profiles = profiles

    if (
      typeof data.activeProfileId === 'string' &&
      profiles.some((p) => p.id === data.activeProfileId)
    ) {
      result.activeProfileId = data.activeProfileId
    } else {
      result.activeProfileId = profiles[0]?.id ?? null
    }

    return result
  } catch (err) {
    console.warn('Could not load saved Pomodoro state:', err)
    return null
  }
}

/** Persist full timer state */
export function savePersistedState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Could not save Pomodoro state:', err)
  }
}

/** Create a unique profile id */
export function createProfileId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
