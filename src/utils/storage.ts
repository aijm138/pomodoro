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
    goingOffSoundEnabled:
      typeof s.goingOffSoundEnabled === 'boolean'
        ? s.goingOffSoundEnabled
        : DEFAULT_SETTINGS.goingOffSoundEnabled,
    backgroundColor: isValidHex(s.backgroundColor)
      ? s.backgroundColor.toLowerCase()
      : DEFAULT_BG,
  }
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
