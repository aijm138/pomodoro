<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import TimerCard from '@/components/TimerCard.vue'
import SessionNotes from '@/components/SessionNotes.vue'
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
  sessionNotes,
  activeSessionIndex,
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
  saveSessionNotes,
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
  <div
    class="flex min-h-screen flex-col"
    :style="{ backgroundColor: settings.backgroundColor }"
  >
    <AppHeader
      :menu-open="menuOpen"
      :allow-skip-work="settings.allowSkipWork"
      :ticking-sound-enabled="settings.tickingSoundEnabled"
      :going-off-sound-enabled="settings.goingOffSoundEnabled"
      :background-color="settings.backgroundColor"
      @update:menu-open="menuOpen = $event"
      @toggle-skip="toggleAllowSkipWork"
      @toggle-ticking="toggleTickingSound"
      @toggle-going-off="toggleGoingOffSound"
      @open-durations="openDurationsModal"
      @open-background="openBackgroundModal"
    />

    <main
      class="flex flex-1 flex-col items-center px-4 py-6 sm:py-10"
    >
      <div class="flex w-full max-w-md flex-col items-stretch gap-5 sm:gap-6">
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
          @toggle="toggleRunning"
          @skip="skipSession"
          @reset="resetCycle"
        />

        <SessionNotes
          :notes="sessionNotes"
          :active-session-index="activeSessionIndex"
          @save="saveSessionNotes"
        />

        <p class="px-2 pb-4 text-center text-xs text-white/35 sm:text-sm">
          Work → short break → … → long break after
          {{ settings.sessionsBeforeLongBreak }} sessions. Settings and notes
          are saved on this device.
        </p>
      </div>
    </main>

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
