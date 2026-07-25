/** Timer phase within a Pomodoro cycle */
export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

/** User-configurable settings (persisted) */
export interface PomodoroSettings {
  workMinutes: number
  /** 0 = no short break (skip straight to next work) */
  shortBreakMinutes: number
  /** 0 = no long break (reset cycle straight to work) */
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

/**
 * Named configuration snapshot: durations + session count + session notes.
 * Sound/background prefs stay global (not per-profile).
 */
export interface PomodoroProfile {
  id: string
  name: string
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
  sessionNotes: string[]
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
  /** Saved named configurations */
  profiles: PomodoroProfile[]
  /** Currently selected profile id, or null if none */
  activeProfileId: string | null
}

/** Draft values while editing durations modal */
export interface DurationDraft {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
}

/**
 * Projected end of one work session in the current cycle,
 * assuming every work + break runs back-to-back with no extra gaps.
 */
export interface WorkSessionProjection {
  /** 0-based work session index in the cycle */
  index: number
  /** Absolute wall-clock end time, or null when already completed */
  endsAt: Date | null
  /** True when this work session has already finished */
  isDone: boolean
  /** True when this is the work session currently counting down */
  isCurrent: boolean
  /**
   * Ready-to-render label:
   * - "done" for completed sessions
   * - "ends 3:42 PM" (locale default) for upcoming / current
   */
  display: string
}
