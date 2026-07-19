<script setup lang="ts">
import { computed } from 'vue'
import ProgressDots from '@/components/ProgressDots.vue'
import TimerControls from '@/components/TimerControls.vue'
import type { TimerMode } from '@/types/pomodoro'

const props = defineProps<{
  displayTime: string
  mode: TimerMode
  modeLabel: string
  modeBadgeClass: string
  isBreak: boolean
  isRunning: boolean
  canSkip: boolean
  completedInCycle: number
  sessionsBeforeLongBreak: number
  /** Minimal layout: timer + note + Start/Pause */
  compact?: boolean
  /** In-app focus mode — show exit (X) control */
  isFocusMode?: boolean
  /** Note text for the current / relevant work session */
  sessionNote?: string
}>()

const emit = defineEmits<{
  toggle: []
  skip: []
  reset: []
  'enter-focus': []
  'exit-focus': []
}>()

const trimmedNote = computed(() => (props.sessionNote ?? '').trim())

/** Show the current session plan under the timer in every layout when set */
const showSessionNote = computed(() => trimmedNote.value.length > 0)
</script>

<template>
  <div
    class="relative w-full max-w-md rounded-3xl border border-white/10 bg-black/45 shadow-2xl backdrop-blur-md"
    :class="compact ? 'px-4 py-5 sm:px-5 sm:py-6' : 'px-5 py-6 sm:px-8 sm:py-8'"
    role="region"
    aria-label="Pomodoro timer"
  >
    <!-- Focus mode exit (X) — top right of card -->
    <button
      v-if="isFocusMode"
      type="button"
      class="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/90 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-400 sm:right-4 sm:top-4"
      aria-label="Exit focus mode"
      title="Exit focus mode"
      @click="emit('exit-focus')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.25"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>

    <!--
      Enter focus mode — mobile only (hidden on desktop md+).
      In-app UI mode; does not use the browser Fullscreen API.
    -->
    <button
      v-else
      type="button"
      class="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/90 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-400 md:hidden"
      aria-label="Enter focus mode"
      title="Focus mode"
      @click="emit('enter-focus')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
        />
      </svg>
    </button>

    <!-- Progress dots (full layout only) -->
    <div v-if="!compact" class="mb-6 flex items-start justify-center pr-10 md:pr-0">
      <ProgressDots
        :total="sessionsBeforeLongBreak"
        :completed="completedInCycle"
      />
    </div>

    <!-- Mode badge -->
    <div :class="compact ? 'mb-2 text-center' : 'mb-3 text-center'">
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide sm:text-sm"
        :class="modeBadgeClass"
      >
        <span
          class="h-1.5 w-1.5 rounded-full bg-current opacity-80"
          aria-hidden="true"
        />
        {{ modeLabel }}
      </span>
    </div>

    <!-- Digital timer -->
    <div
      class="timer-display select-none text-center font-mono leading-none"
      :class="[
        isBreak ? 'text-break-light' : 'text-tomato-300',
        compact
          ? 'mb-3 text-6xl sm:text-7xl'
          : 'mb-2 text-7xl sm:text-8xl md:text-9xl',
      ]"
      aria-live="polite"
      aria-atomic="true"
      :aria-label="`Time remaining: ${displayTime}`"
    >
      {{ displayTime }}
    </div>

    <!-- Current session note (all layouts, when set) -->
    <p
      v-if="showSessionNote"
      class="mx-auto mt-1 max-w-sm px-2 text-center text-sm leading-relaxed text-white/75 sm:text-base"
      :class="compact ? 'mb-4' : 'mb-3'"
    >
      {{ trimmedNote }}
    </p>

    <p
      v-if="!compact"
      class="text-center text-sm text-white/50"
      :class="showSessionNote ? 'mb-8' : 'mb-8 mt-0'"
    >
      <template v-if="mode === 'work'">
        Focus session
        {{ Math.min(completedInCycle + 1, sessionsBeforeLongBreak) }} of
        {{ sessionsBeforeLongBreak }}
      </template>
      <template v-else-if="mode === 'shortBreak'">
        Short break — recharge
      </template>
      <template v-else> Long break — well done! </template>
    </p>

    <!-- Spacer when compact + no note so controls aren't cramped -->
    <div v-else-if="!showSessionNote" class="mb-3" />

    <div :class="compact ? 'mt-1' : ''">
      <TimerControls
        :is-running="isRunning"
        :is-break="isBreak"
        :can-skip="canSkip"
        :compact="compact"
        @toggle="emit('toggle')"
        @skip="emit('skip')"
        @reset="emit('reset')"
      />
    </div>
  </div>
</template>
