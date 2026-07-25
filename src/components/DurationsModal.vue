<script setup lang="ts">
import type { DurationDraft } from '@/types/pomodoro'
import {
  LONG_BREAK_RANGE,
  SESSIONS_RANGE,
  SHORT_BREAK_RANGE,
  WORK_MINUTES_RANGE,
} from '@/constants/pomodoro'

const props = defineProps<{
  open: boolean
  draft: DurationDraft
  error: string
}>()

const emit = defineEmits<{
  close: []
  save: []
  'update:draft': [value: DurationDraft]
}>()

function updateField<K extends keyof DurationDraft>(
  key: K,
  value: number | string,
): void {
  emit('update:draft', {
    ...props.draft,
    [key]: typeof value === 'string' ? Number(value) : value,
  })
}
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="durations-title"
    @click.self="emit('close')"
  >
    <div
      class="modal-panel max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:max-w-md sm:rounded-3xl"
    >
      <div
        class="sticky top-0 flex items-center justify-between border-b border-white/10 bg-zinc-900/95 px-5 py-4 backdrop-blur"
      >
        <h2 id="durations-title" class="text-lg font-semibold text-white">
          Customize durations
        </h2>
        <button
          type="button"
          class="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
          @click="emit('close')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form class="space-y-5 px-5 py-5" @submit.prevent="emit('save')">
        <div>
          <label
            for="work-min"
            class="mb-1.5 block text-sm font-medium text-white/80"
          >
            Work session (minutes)
          </label>
          <input
            id="work-min"
            :value="draft.workMinutes"
            type="number"
            :min="WORK_MINUTES_RANGE.min"
            :max="WORK_MINUTES_RANGE.max"
            required
            class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-tomato-400"
            @input="
              updateField(
                'workMinutes',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </div>

        <div>
          <label
            for="short-min"
            class="mb-1.5 block text-sm font-medium text-white/80"
          >
            Short break (minutes)
          </label>
          <input
            id="short-min"
            :value="draft.shortBreakMinutes"
            type="number"
            :min="SHORT_BREAK_RANGE.min"
            :max="SHORT_BREAK_RANGE.max"
            required
            class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-tomato-400"
            @input="
              updateField(
                'shortBreakMinutes',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
          <p class="mt-1.5 text-xs text-white/40">
            Set to 0 to skip short breaks (work sessions run back-to-back).
          </p>
        </div>

        <div>
          <label
            for="long-min"
            class="mb-1.5 block text-sm font-medium text-white/80"
          >
            Long break (minutes)
          </label>
          <input
            id="long-min"
            :value="draft.longBreakMinutes"
            type="number"
            :min="LONG_BREAK_RANGE.min"
            :max="LONG_BREAK_RANGE.max"
            required
            class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-tomato-400"
            @input="
              updateField(
                'longBreakMinutes',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
          <p class="mt-1.5 text-xs text-white/40">
            Set to 0 to skip the long break and start a new cycle immediately.
          </p>
        </div>

        <div>
          <label
            for="sessions-n"
            class="mb-1.5 block text-sm font-medium text-white/80"
          >
            Work sessions before long break
          </label>
          <input
            id="sessions-n"
            :value="draft.sessionsBeforeLongBreak"
            type="number"
            :min="SESSIONS_RANGE.min"
            :max="SESSIONS_RANGE.max"
            required
            class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-tomato-400"
            @input="
              updateField(
                'sessionsBeforeLongBreak',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
          <p class="mt-1.5 text-xs text-white/40">
            Progress dots ({{ SESSIONS_RANGE.min }}–{{ SESSIONS_RANGE.max }}).
            Default is 4.
          </p>
        </div>

        <p v-if="error" class="text-sm text-tomato-300" role="alert">
          {{ error }}
        </p>

        <div class="flex gap-3 pb-1 pt-1">
          <button
            type="button"
            class="touch-target h-12 flex-1 rounded-xl border border-white/15 bg-white/5 font-medium text-white transition-colors hover:bg-white/10"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="touch-target h-12 flex-1 rounded-xl bg-tomato-500 font-semibold text-white shadow-glow transition-colors hover:bg-tomato-600"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
