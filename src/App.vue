<script setup lang="ts">
import TimerCard from '@/components/TimerCard.vue'
import DurationsModal from '@/components/DurationsModal.vue'
import BackgroundModal from '@/components/BackgroundModal.vue'
import { usePomodoro } from '@/composables/usePomodoro'
import type { DurationDraft } from '@/types/pomodoro'

const {
  DEFAULT_BG,
  BACKGROUND_PRESETS,
  settings,
  mode,
  completedInCycle,
  isRunning,
  menuOpen,
  showDurationsModal,
  showBackgroundModal,
  durationsError,
  draft,
  isBreak,
  modeLabel,
  modeBadgeClass,
  displayTime,
  canSkip,
  toggleRunning,
  skipSession,
  resetCycle,
  toggleAllowSkipWork,
  toggleTickingSound,
  toggleGoingOffSound,
  openDurationsModal,
  closeDurationsModal,
  saveDurations,
  openBackgroundModal,
  closeBackgroundModal,
  setBackground,
  onBackgroundLive,
  onBackgroundHex,
} = usePomodoro()

function onDraftUpdate(value: DurationDraft): void {
  draft.value = value
}

function resetBackgroundAndClose(): void {
  setBackground(DEFAULT_BG)
  closeBackgroundModal()
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <div
      class="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12"
      :style="{ backgroundColor: settings.backgroundColor }"
    >
      <TimerCard
        :display-time="displayTime"
        :mode="mode"
        :mode-label="modeLabel"
        :mode-badge-class="modeBadgeClass"
        :is-break="isBreak"
        :is-running="isRunning"
        :can-skip="canSkip"
        :completed-in-cycle="completedInCycle"
        :sessions-before-long-break="settings.sessionsBeforeLongBreak"
        :menu-open="menuOpen"
        :allow-skip-work="settings.allowSkipWork"
        :ticking-sound-enabled="settings.tickingSoundEnabled"
        :going-off-sound-enabled="settings.goingOffSoundEnabled"
        @update:menu-open="menuOpen = $event"
        @toggle="toggleRunning"
        @skip="skipSession"
        @reset="resetCycle"
        @toggle-skip="toggleAllowSkipWork"
        @toggle-ticking="toggleTickingSound"
        @toggle-going-off="toggleGoingOffSound"
        @open-durations="openDurationsModal"
        @open-background="openBackgroundModal"
      />

      <p
        class="mt-6 max-w-sm px-2 text-center text-xs text-white/35 sm:text-sm"
      >
        Work → short break → … → long break after
        {{ settings.sessionsBeforeLongBreak }} sessions. Settings are saved on
        this device.
      </p>
    </div>

    <!-- Outside-click for the settings menu is handled inside SettingsMenu -->

    <DurationsModal
      :open="showDurationsModal"
      :draft="draft"
      :error="durationsError"
      @close="closeDurationsModal"
      @save="saveDurations"
      @update:draft="onDraftUpdate"
    />

    <BackgroundModal
      :open="showBackgroundModal"
      :background-color="settings.backgroundColor"
      :presets="BACKGROUND_PRESETS"
      :default-bg="DEFAULT_BG"
      @close="closeBackgroundModal"
      @set-background="setBackground"
      @live-color="onBackgroundLive"
      @hex-input="onBackgroundHex"
      @reset-default="resetBackgroundAndClose"
    />
  </div>
</template>
