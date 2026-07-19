import type { PersistedState, PomodoroSettings, TimerMode } from '@/types/pomodoro'
import { clamp } from '@/utils/clamp'
import { isValidHex } from '@/utils/color'
import {
  DEFAULT_BG,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
} from '@/constants/pomodoro'

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'work' || value === 'shortBreak' || value === 'longBreak'
}

function sanitizeSettings(raw: Partial<PomodoroSettings> | undefined): PomodoroSettings {
  const s = raw ?? {}
  return {
    workMinutes: clamp(s.workMinutes, 1, 180, DEFAULT_SETTINGS.workMinutes),
    shortBreakMinutes: clamp(
      s.shortBreakMinutes,
      1,
      60,
      DEFAULT_SETTINGS.shortBreakMinutes,
    ),
    longBreakMinutes: clamp(
      s.longBreakMinutes,
      1,
      90,
      DEFAULT_SETTINGS.longBreakMinutes,
    ),
    sessionsBeforeLongBreak: clamp(
      s.sessionsBeforeLongBreak,
      1,
      12,
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
  const size = Math.max(1, Math.min(12, Math.floor(count)))
  const source = Array.isArray(raw) ? raw : []
  const notes: string[] = []
  for (let i = 0; i < size; i++) {
    const value = source[i]
    notes.push(typeof value === 'string' ? value : '')
  }
  return notes
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
