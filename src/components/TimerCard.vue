<script setup lang="ts">
import ProgressDots from '@/components/ProgressDots.vue'
import SettingsMenu from '@/components/SettingsMenu.vue'
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
  menuOpen: boolean
  allowSkipWork: boolean
  tickingSoundEnabled: boolean
  goingOffSoundEnabled: boolean
}>()

const emit = defineEmits<{
  'update:menuOpen': [value: boolean]
  toggle: []
  skip: []
  reset: []
  'toggle-skip': []
  'toggle-ticking': []
  'toggle-going-off': []
  'open-durations': []
  'open-background': []
}>()
</script>

<template>
  <div
    class="relative w-full max-w-md rounded-3xl border border-white/10 bg-black/45 px-5 py-6 shadow-2xl backdrop-blur-md sm:px-8 sm:py-8"
    role="region"
    aria-label="Pomodoro timer"
  >
    <!-- Header: progress + menu -->
    <div class="mb-6 flex items-start justify-between gap-3">
      <ProgressDots
        :total="sessionsBeforeLongBreak"
        :completed="completedInCycle"
      />

      <div class="flex items-center gap-2">
        <span
          class="select-none text-2xl sm:text-3xl"
          aria-hidden="true"
          title="Pomodoro"
        >
          🍅
        </span>

        <SettingsMenu
          :open="menuOpen"
          :allow-skip-work="allowSkipWork"
          :ticking-sound-enabled="tickingSoundEnabled"
          :going-off-sound-enabled="goingOffSoundEnabled"
          @update:open="emit('update:menuOpen', $event)"
          @toggle-skip="emit('toggle-skip')"
          @toggle-ticking="emit('toggle-ticking')"
          @toggle-going-off="emit('toggle-going-off')"
          @open-durations="emit('open-durations')"
          @open-background="emit('open-background')"
        />
      </div>
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
