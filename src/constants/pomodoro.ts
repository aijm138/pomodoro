import type { PomodoroSettings } from '@/types/pomodoro'

export const STORAGE_KEY = 'pomodoro-timer-v1'

export const DEFAULT_BG = '#1a0a0a'

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  allowSkipWork: false,
  tickingSoundEnabled: true,
  goingOffSoundEnabled: true,
  backgroundColor: DEFAULT_BG,
}

/** Served from /public via Vite */
export const TICKING_SOUND_SRC = '/pomodoro_timer_ticking.mp3'
export const GOING_OFF_SOUND_SRC = '/pomodoro_timer_going_off.mp3'

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
