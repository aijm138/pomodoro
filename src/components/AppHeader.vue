<script setup lang="ts">
import SettingsMenu from '@/components/SettingsMenu.vue'

defineProps<{
  menuOpen: boolean
  allowSkipWork: boolean
  tickingSoundEnabled: boolean
  tickingDuringBreaks: boolean
  goingOffSoundEnabled: boolean
  completionSoundEnabled: boolean
  backgroundColor: string
}>()

const emit = defineEmits<{
  'update:menuOpen': [value: boolean]
  'toggle-skip': []
  'toggle-ticking': []
  'toggle-ticking-breaks': []
  'toggle-going-off': []
  'toggle-completion': []
  'open-durations': []
  'open-background': []
}>()
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-md"
    :style="{ backgroundColor: `${backgroundColor}cc` }"
  >
    <div
      class="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4 sm:h-16 sm:px-5"
    >
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="select-none text-2xl sm:text-3xl" aria-hidden="true">
          🍅
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold tracking-tight text-white sm:text-base">
            Pomodoro Timer
          </p>
          <p class="hidden truncate text-xs text-white/45 sm:block">
            Focus · Break · Repeat
          </p>
        </div>
      </div>

      <SettingsMenu
        :open="menuOpen"
        :allow-skip-work="allowSkipWork"
        :ticking-sound-enabled="tickingSoundEnabled"
        :ticking-during-breaks="tickingDuringBreaks"
        :going-off-sound-enabled="goingOffSoundEnabled"
        :completion-sound-enabled="completionSoundEnabled"
        @update:open="emit('update:menuOpen', $event)"
        @toggle-skip="emit('toggle-skip')"
        @toggle-ticking="emit('toggle-ticking')"
        @toggle-ticking-breaks="emit('toggle-ticking-breaks')"
        @toggle-going-off="emit('toggle-going-off')"
        @toggle-completion="emit('toggle-completion')"
        @open-durations="emit('open-durations')"
        @open-background="emit('open-background')"
      />
    </div>
  </header>
</template>
