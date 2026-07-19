/** Timer phase within a Pomodoro cycle */
export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

/** User-configurable settings (persisted) */
export interface PomodoroSettings {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  /** Number of work sessions before a long break (also = progress dots) */
  sessionsBeforeLongBreak: number
  /** When true, Skip is enabled during work sessions */
  allowSkipWork: boolean
  /** Loop ticking sound while the timer is running */
  tickingSoundEnabled: boolean
  /** Play alarm when a session reaches zero */
  goingOffSoundEnabled: boolean
  /** Page background color as #rrggbb */
  backgroundColor: string
}

/** Shape stored in localStorage */
export interface PersistedState {
  settings: PomodoroSettings
  mode: TimerMode
  completedInCycle: number
  remainingSeconds: number
}

/** Draft values while editing durations modal */
export interface DurationDraft {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
}
