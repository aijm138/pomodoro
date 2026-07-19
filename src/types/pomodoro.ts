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
  /** Loop ticking sound while the timer is running (work sessions) */
  tickingSoundEnabled: boolean
  /** Also play ticking sound during short/long breaks */
  tickingDuringBreaks: boolean
  /** Play alarm when a work session reaches zero */
  goingOffSoundEnabled: boolean
  /** Play lesson-complete sound when all work sessions in the cycle finish */
  completionSoundEnabled: boolean
  /** Page background color as #rrggbb */
  backgroundColor: string
}

/** Shape stored in localStorage */
export interface PersistedState {
  settings: PomodoroSettings
  mode: TimerMode
  completedInCycle: number
  remainingSeconds: number
  /** Planned work for each focus session in the cycle (index 0 = session 1) */
  sessionNotes: string[]
  /** Whether the timer was running when last saved */
  isRunning: boolean
  /** Absolute end time (ms since epoch) while running — survives minimize/background */
  endTimestamp: number | null
}

/** Draft values while editing durations modal */
export interface DurationDraft {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
}
