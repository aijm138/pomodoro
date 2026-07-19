<script setup lang="ts">
defineProps<{
  isRunning: boolean
  isBreak: boolean
  canSkip: boolean
}>()

const emit = defineEmits<{
  toggle: []
  skip: []
  reset: []
}>()
</script>

<template>
  <div>
    <div class="flex items-center justify-center gap-3 sm:gap-4">
      <!-- Start / Pause -->
      <button
        type="button"
        class="touch-target flex h-14 min-w-[9.5rem] items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold shadow-lg transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:h-16 sm:min-w-[11rem] sm:text-lg"
        :class="
          isRunning
            ? 'border border-white/20 bg-white/15 text-white hover:bg-white/20 focus-visible:ring-white/50'
            : isBreak
              ? 'bg-break text-white shadow-glow-green hover:bg-break-dark focus-visible:ring-break'
              : 'bg-tomato-500 text-white shadow-glow hover:bg-tomato-600 focus-visible:ring-tomato-400'
        "
        :aria-label="isRunning ? 'Pause timer' : 'Start timer'"
        @click="emit('toggle')"
      >
        <svg
          v-if="!isRunning"
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M7 5a1 1 0 00-1 1v12a1 1 0 001 1h3a1 1 0 001-1V6a1 1 0 00-1-1H7zm7 0a1 1 0 00-1 1v12a1 1 0 001 1h3a1 1 0 001-1V6a1 1 0 00-1-1h-3z"
          />
        </svg>
        <span>{{ isRunning ? 'Pause' : 'Start' }}</span>
      </button>

      <!-- Skip -->
      <button
        type="button"
        class="touch-target flex h-14 items-center justify-center gap-2 rounded-2xl border px-5 text-base font-semibold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 sm:h-16"
        :class="
          canSkip
            ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'border-white/10 bg-white/5 text-white/50'
        "
        :disabled="!canSkip"
        :aria-disabled="!canSkip"
        :title="
          canSkip
            ? 'Skip to next session'
            : 'Skipping work sessions is disabled in settings'
        "
        aria-label="Skip current session"
        @click="emit('skip')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M5.5 5.14a1 1 0 00-1.5.86v12a1 1 0 001.5.86l9-6a1 1 0 000-1.72l-9-6zM18 5a1 1 0 00-1 1v12a1 1 0 002 0V6a1 1 0 00-1-1z"
          />
        </svg>
        <span class="sm:inline">Skip</span>
      </button>
    </div>

    <div class="mt-5 text-center">
      <button
        type="button"
        class="text-xs text-white/40 underline-offset-2 transition-colors hover:text-white/70 hover:underline focus:outline-none focus-visible:text-white/80 sm:text-sm"
        @click="emit('reset')"
      >
        Reset cycle
      </button>
    </div>
  </div>
</template>
