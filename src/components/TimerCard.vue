<script setup lang="ts">
import ProgressDots from '@/components/ProgressDots.vue'
import TimerControls from '@/components/TimerControls.vue'
import type { TimerMode } from '@/types/pomodoro'

defineProps<{
  displayTime: string
  mode: TimerMode
  modeLabel: string
  modeBadgeClass: string
  isBreak: boolean
  isRunning: boolean
  canSkip: boolean
  completedInCycle: number
  sessionsBeforeLongBreak: number
}>()

const emit = defineEmits<{
  toggle: []
  skip: []
  reset: []
}>()
</script>

<template>
  <div
    class="relative w-full max-w-md rounded-3xl border border-white/10 bg-black/45 px-5 py-6 shadow-2xl backdrop-blur-md sm:px-8 sm:py-8"
    role="region"
    aria-label="Pomodoro timer"
  >
    <!-- Progress dots -->
    <div class="mb-6 flex items-start justify-center">
      <ProgressDots
        :total="sessionsBeforeLongBreak"
        :completed="completedInCycle"
      />
    </div>

    <!-- Mode badge -->
    <div class="mb-3 text-center">
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
      class="timer-display mb-2 select-none text-center font-mono text-7xl leading-none sm:text-8xl md:text-9xl"
      :class="isBreak ? 'text-break-light' : 'text-tomato-300'"
      aria-live="polite"
      aria-atomic="true"
      :aria-label="`Time remaining: ${displayTime}`"
    >
      {{ displayTime }}
    </div>

    <p class="mb-8 text-center text-sm text-white/50">
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

    <TimerControls
      :is-running="isRunning"
      :is-break="isBreak"
      :can-skip="canSkip"
      @toggle="emit('toggle')"
      @skip="emit('skip')"
      @reset="emit('reset')"
    />
  </div>
</template>
