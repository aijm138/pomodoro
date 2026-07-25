import type { PomodoroProfile, PomodoroSettings } from '@/types/pomodoro'

export const STORAGE_KEY = 'pomodoro-timer-v1'

export const DEFAULT_BG = '#1a0a0a'

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  allowSkipWork: false,
  tickingSoundEnabled: true,
  tickingDuringBreaks: false,
  goingOffSoundEnabled: true,
  completionSoundEnabled: true,
  backgroundColor: DEFAULT_BG,
}

/** Max work sessions in a cycle (progress dots / notes slots) */
export const MAX_SESSIONS = 12

/** Min / max for duration fields (breaks may be 0 = skipped) */
export const WORK_MINUTES_RANGE = { min: 1, max: 180 } as const
export const SHORT_BREAK_RANGE = { min: 0, max: 60 } as const
export const LONG_BREAK_RANGE = { min: 0, max: 90 } as const
export const SESSIONS_RANGE = { min: 1, max: MAX_SESSIONS } as const

/** Served from /public via Vite */
export const TICKING_SOUND_SRC = '/pomodoro_clock_ticking.mp3'
export const GOING_OFF_SOUND_SRC = '/pomodoro_clock_going_off.mp3'
export const COMPLETION_SOUND_SRC = '/trw_lesson_complete_sound.mp3'

/** Quick-pick background colors for the customize modal */
export const BACKGROUND_PRESETS: readonly string[] = [
  '#1a0a0a', // deep tomato black (default)
  '#0f172a', // slate night
  '#14532d', // forest
  '#1e1b4b', // indigo
  '#3b0764', // purple
  '#451a03', // warm brown
  '#0c4a6e', // ocean
  '#18181b', // zinc
] as const

/** Build a default profile snapshot from current-style defaults */
export function createDefaultProfile(
  id = 'default',
  name = 'Default',
): PomodoroProfile {
  return {
    id,
    name,
    workMinutes: DEFAULT_SETTINGS.workMinutes,
    shortBreakMinutes: DEFAULT_SETTINGS.shortBreakMinutes,
    longBreakMinutes: DEFAULT_SETTINGS.longBreakMinutes,
    sessionsBeforeLongBreak: DEFAULT_SETTINGS.sessionsBeforeLongBreak,
    sessionNotes: Array.from(
      { length: DEFAULT_SETTINGS.sessionsBeforeLongBreak },
      () => '',
    ),
  }
}
