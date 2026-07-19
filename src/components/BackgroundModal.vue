<script setup lang="ts">
defineProps<{
  open: boolean
  backgroundColor: string
  presets: readonly string[]
  defaultBg: string
}>()

const emit = defineEmits<{
  close: []
  'set-background': [hex: string]
  'live-color': [event: Event]
  'hex-input': [event: Event]
  'reset-default': []
}>()
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bg-title"
    @click.self="emit('close')"
  >
    <div
      class="modal-panel w-full rounded-t-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:max-w-md sm:rounded-3xl"
    >
      <div
        class="flex items-center justify-between border-b border-white/10 px-5 py-4"
      >
        <h2 id="bg-title" class="text-lg font-semibold text-white">
          Customize background
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

      <div class="space-y-5 px-5 py-6">
        <p class="text-sm text-white/60">
          Pick any color. The page background updates live; the timer card keeps
          the Pomodoro theme for contrast.
        </p>

        <div class="flex items-center gap-4">
          <input
            id="bg-color"
            type="color"
            :value="backgroundColor"
            class="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-transparent"
            aria-label="Background color"
            @input="emit('live-color', $event)"
          />
          <div class="min-w-0 flex-1">
            <label
              for="bg-hex"
              class="mb-1.5 block text-sm font-medium text-white/80"
            >
              Hex color
            </label>
            <input
              id="bg-hex"
              type="text"
              :value="backgroundColor"
              maxlength="7"
              pattern="^#[0-9A-Fa-f]{6}$"
              class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-mono uppercase text-white focus:outline-none focus:ring-2 focus:ring-tomato-400"
              @input="emit('hex-input', $event)"
            />
          </div>
        </div>

        <div>
          <p
            class="mb-2 text-xs font-medium uppercase tracking-wide text-white/50"
          >
            Presets
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in presets"
              :key="preset"
              type="button"
              class="h-9 w-9 rounded-lg border-2 transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              :class="
                backgroundColor.toLowerCase() === preset.toLowerCase()
                  ? 'scale-110 border-white'
                  : 'border-white/20 hover:border-white/50'
              "
              :style="{ backgroundColor: preset }"
              :aria-label="`Set background to ${preset}`"
              :title="preset"
              @click="emit('set-background', preset)"
            />
          </div>
        </div>

        <div class="flex gap-3 pt-1">
          <button
            type="button"
            class="touch-target h-12 flex-1 rounded-xl border border-white/15 bg-white/5 font-medium text-white transition-colors hover:bg-white/10"
            @click="emit('reset-default')"
          >
            Reset default
          </button>
          <button
            type="button"
            class="touch-target h-12 flex-1 rounded-xl bg-tomato-500 font-semibold text-white shadow-glow transition-colors hover:bg-tomato-600"
            @click="emit('close')"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
