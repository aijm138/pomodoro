<script setup lang="ts">
import { computed } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import TimerCard from '@/components/TimerCard.vue'
import SessionNotes from '@/components/SessionNotes.vue'
import DurationsModal from '@/components/DurationsModal.vue'
import BackgroundModal from '@/components/BackgroundModal.vue'
import { usePomodoro } from '@/composables/usePomodoro'
import { useCompactViewport } from '@/composables/useCompactViewport'
import { useFullscreen } from '@/composables/useFullscreen'
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

const { isCompact } = useCompactViewport()
const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen()

/**
 * Minimal chrome when the viewport is tiny OR the user entered fullscreen.
 * Fullscreen uses the same focused layout as the <414×414 compact mode.
 */
const useMinimalLayout = computed(
  () => isCompact.value || isFullscreen.value,
)

/**
 * Note under the timer in compact / fullscreen layouts:
 * - Work: current session's plan
 * - Break: upcoming work session's plan (what you'll do next)
 */
const currentSessionNote = computed(() => {
  const notes = sessionNotes.value
  if (notes.length === 0) return ''

  if (mode.value === 'work') {
    const idx = activeSessionIndex.value
    if (idx >= 0 && idx < notes.length) return notes[idx] ?? ''
    return ''
  }

  // On a break — show the next work session note when available
  const nextIdx = completedInCycle.value
  if (nextIdx >= 0 && nextIdx < notes.length) {
    return notes[nextIdx] ?? ''
  }
  return ''
})

function onDraftUpdate(value: DurationDraft): void {
  draft.value = value
}

function resetBackgroundAndClose(): void {
  setBackground(DEFAULT_BG)
  closeBackgroundModal()
}

async function onEnterFullscreen(): Promise<void> {
  menuOpen.value = false
  await enterFullscreen()
}

async function onExitFullscreen(): Promise<void> {
  await exitFullscreen()
}
</script>

<template>
  <div
    class="flex min-h-screen flex-col"
    :style="{ backgroundColor: settings.backgroundColor }"
  >
    <!-- Full chrome only when there's room and not fullscreen -->
    <AppHeader
      v-if="!useMinimalLayout"
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
      class="flex flex-1 flex-col items-center"
      :class="
        useMinimalLayout
          ? 'justify-center px-3 py-3'
          : 'px-4 py-6 sm:py-10'
      "
    >
      <div
        class="flex w-full max-w-md flex-col items-stretch"
        :class="useMinimalLayout ? 'gap-0' : 'gap-5 sm:gap-6'"
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
          :compact="useMinimalLayout"
          :is-fullscreen="isFullscreen"
          :session-note="currentSessionNote"
          @toggle="toggleRunning"
          @skip="skipSession"
          @reset="resetCycle"
          @fullscreen="onEnterFullscreen"
          @exit-fullscreen="onExitFullscreen"
        />

        <template v-if="!useMinimalLayout">
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
        </template>
      </div>
    </main>

    <DurationsModal
      v-if="!useMinimalLayout"
      :open="showDurationsModal"
      :draft="draft"
      :error="durationsError"
      @close="closeDurationsModal"
      @save="saveDurations"
      @update:draft="onDraftUpdate"
    />

    <BackgroundModal
      v-if="!useMinimalLayout"
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
