<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import TimerCard from '@/components/TimerCard.vue'
import SessionNotes from '@/components/SessionNotes.vue'
import DurationsModal from '@/components/DurationsModal.vue'
import BackgroundModal from '@/components/BackgroundModal.vue'
import { usePomodoro } from '@/composables/usePomodoro'
import { useCompactViewport } from '@/composables/useCompactViewport'
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
  toggleTickingDuringBreaks,
  toggleGoingOffSound,
  toggleCompletionSound,
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

/**
 * In-app focus mode (not the browser Fullscreen API).
 * Shows only the timer card: mode, time, session note, Start/Pause, exit X.
 */
const isFocusMode = ref(false)

/**
 * Minimal chrome when the viewport is tiny OR the user entered focus mode.
 */
const useMinimalLayout = computed(
  () => isCompact.value || isFocusMode.value,
)

/**
 * Note under the timer:
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

function enterFocusMode(): void {
  menuOpen.value = false
  showDurationsModal.value = false
  showBackgroundModal.value = false
  isFocusMode.value = true
}

function exitFocusMode(): void {
  isFocusMode.value = false
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isFocusMode.value) {
    e.preventDefault()
    exitFocusMode()
  }
}

// Body scroll lock while in focus mode
watch(isFocusMode, (on) => {
  document.body.style.overflow = on ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div
    class="flex min-h-screen flex-col"
    :class="isFocusMode ? 'fixed inset-0 z-[60] overflow-hidden' : ''"
    :style="{ backgroundColor: settings.backgroundColor }"
  >
    <!-- Full chrome only when there's room and not in focus mode -->
    <AppHeader
      v-if="!useMinimalLayout"
      :menu-open="menuOpen"
      :allow-skip-work="settings.allowSkipWork"
      :ticking-sound-enabled="settings.tickingSoundEnabled"
      :ticking-during-breaks="settings.tickingDuringBreaks"
      :going-off-sound-enabled="settings.goingOffSoundEnabled"
      :completion-sound-enabled="settings.completionSoundEnabled"
      :background-color="settings.backgroundColor"
      @update:menu-open="menuOpen = $event"
      @toggle-skip="toggleAllowSkipWork"
      @toggle-ticking="toggleTickingSound"
      @toggle-ticking-breaks="toggleTickingDuringBreaks"
      @toggle-going-off="toggleGoingOffSound"
      @toggle-completion="toggleCompletionSound"
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
          :is-focus-mode="isFocusMode"
          :session-note="currentSessionNote"
          @toggle="toggleRunning"
          @skip="skipSession"
          @reset="resetCycle"
          @enter-focus="enterFocusMode"
          @exit-focus="exitFocusMode"
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
