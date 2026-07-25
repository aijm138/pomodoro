<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { MAX_SESSIONS, SESSIONS_RANGE } from '@/constants/pomodoro'

const props = defineProps<{
  open: boolean
  allowSkipWork: boolean
  tickingSoundEnabled: boolean
  tickingDuringBreaks: boolean
  goingOffSoundEnabled: boolean
  completionSoundEnabled: boolean
  sessionsBeforeLongBreak: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'toggle-skip': []
  'toggle-ticking': []
  'toggle-ticking-breaks': []
  'toggle-going-off': []
  'toggle-completion': []
  'update-sessions': [count: number]
  'open-durations': []
  'open-background': []
  'open-profiles': []
}>()

const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLDivElement | null>(null)

/** Local draft so typing doesn't spam parent until blur/enter */
const sessionsDraft = ref(String(props.sessionsBeforeLongBreak))

watch(
  () => props.sessionsBeforeLongBreak,
  (n) => {
    sessionsDraft.value = String(n)
  },
)

/** Fixed position for teleported menu (avoids stacking-context bugs) */
const menuStyle = ref<Record<string, string>>({
  top: '0px',
  right: '0px',
})

function updateMenuPosition(): void {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  menuStyle.value = {
    position: 'fixed',
    top: `${Math.round(rect.bottom + 8)}px`,
    right: `${Math.round(window.innerWidth - rect.right)}px`,
  }
}

function close(): void {
  emit('update:open', false)
}

function toggleOpen(): void {
  if (!props.open) {
    updateMenuPosition()
  }
  emit('update:open', !props.open)
}

function onToggleSkip(): void {
  emit('toggle-skip')
}

function onToggleTicking(): void {
  emit('toggle-ticking')
}

function onToggleTickingBreaks(): void {
  emit('toggle-ticking-breaks')
}

function onToggleGoingOff(): void {
  emit('toggle-going-off')
}

function onToggleCompletion(): void {
  emit('toggle-completion')
}

function commitSessions(): void {
  const n = Number(sessionsDraft.value)
  if (!Number.isFinite(n)) {
    sessionsDraft.value = String(props.sessionsBeforeLongBreak)
    return
  }
  const clamped = Math.min(
    SESSIONS_RANGE.max,
    Math.max(SESSIONS_RANGE.min, Math.round(n)),
  )
  sessionsDraft.value = String(clamped)
  if (clamped !== props.sessionsBeforeLongBreak) {
    emit('update-sessions', clamped)
  }
}

function onSessionsKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitSessions()
    ;(event.target as HTMLInputElement | null)?.blur()
  }
}

function onOpenDurations(): void {
  emit('open-durations')
}

function onOpenBackground(): void {
  emit('open-background')
}

function onOpenProfiles(): void {
  emit('open-profiles')
}

/** Close when clicking outside trigger + menu */
function onPointerDown(event: PointerEvent): void {
  if (!props.open) return
  const target = event.target as Node | null
  if (!target) return
  if (triggerRef.value?.contains(target)) return
  if (menuRef.value?.contains(target)) return
  close()
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

function onViewportChange(): void {
  if (props.open) updateMenuPosition()
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      sessionsDraft.value = String(props.sessionsBeforeLongBreak)
      updateMenuPosition()
      await nextTick()
      updateMenuPosition()
    }
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      type="button"
      class="touch-target flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition-colors hover:bg-white/15 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-400"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="Open settings menu"
      @click.stop="toggleOpen"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-white/90"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.75"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>

    <!-- Teleport to body so nothing (overlay / stacking) can intercept clicks -->
    <Teleport to="body">
      <div
        v-if="open"
        ref="menuRef"
        class="z-[100] w-72 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur-md"
        role="menu"
        :style="menuStyle"
        @click.stop
        @pointerdown.stop
      >
        <!-- Allow skip work — whole row is one button (no nested controls) -->
        <button
          type="button"
          role="menuitemcheckbox"
          :aria-checked="allowSkipWork"
          class="flex w-full cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/5"
          @click="onToggleSkip"
        >
          <span class="text-sm leading-snug text-white/90">
            Allow skipping work sessions
          </span>
          <span
            class="relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors"
            :class="allowSkipWork ? 'bg-tomato-500' : 'bg-white/20'"
            aria-hidden="true"
          >
            <span
              class="mt-1 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="allowSkipWork ? 'translate-x-6' : 'translate-x-1'"
            />
          </span>
        </button>

        <div class="h-px bg-white/10" />

        <!-- Ticking sound -->
        <button
          type="button"
          role="menuitemcheckbox"
          :aria-checked="tickingSoundEnabled"
          class="flex w-full cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/5"
          @click="onToggleTicking"
        >
          <span class="text-sm leading-snug text-white/90">Ticking sound</span>
          <span
            class="relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors"
            :class="tickingSoundEnabled ? 'bg-tomato-500' : 'bg-white/20'"
            aria-hidden="true"
          >
            <span
              class="mt-1 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="tickingSoundEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </span>
        </button>

        <!-- Ticking during breaks -->
        <button
          type="button"
          role="menuitemcheckbox"
          :aria-checked="tickingDuringBreaks"
          :aria-disabled="!tickingSoundEnabled"
          class="flex w-full cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/5"
          :class="!tickingSoundEnabled ? 'opacity-50' : ''"
          @click="onToggleTickingBreaks"
        >
          <span class="text-sm leading-snug text-white/90">
            Play ticking during breaks
          </span>
          <span
            class="relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors"
            :class="
              tickingDuringBreaks && tickingSoundEnabled
                ? 'bg-tomato-500'
                : 'bg-white/20'
            "
            aria-hidden="true"
          >
            <span
              class="mt-1 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="
                tickingDuringBreaks && tickingSoundEnabled
                  ? 'translate-x-6'
                  : 'translate-x-1'
              "
            />
          </span>
        </button>

        <!-- Going-off sound -->
        <button
          type="button"
          role="menuitemcheckbox"
          :aria-checked="goingOffSoundEnabled"
          class="flex w-full cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/5"
          @click="onToggleGoingOff"
        >
          <span class="text-sm leading-snug text-white/90">Going-off sound</span>
          <span
            class="relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors"
            :class="goingOffSoundEnabled ? 'bg-tomato-500' : 'bg-white/20'"
            aria-hidden="true"
          >
            <span
              class="mt-1 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="goingOffSoundEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </span>
        </button>

        <!-- Work completion sound -->
        <button
          type="button"
          role="menuitemcheckbox"
          :aria-checked="completionSoundEnabled"
          class="flex w-full cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/5"
          @click="onToggleCompletion"
        >
          <span class="text-sm leading-snug text-white/90">
            Completion sound
          </span>
          <span
            class="relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors"
            :class="completionSoundEnabled ? 'bg-tomato-500' : 'bg-white/20'"
            aria-hidden="true"
          >
            <span
              class="mt-1 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="
                completionSoundEnabled ? 'translate-x-6' : 'translate-x-1'
              "
            />
          </span>
        </button>

        <div class="h-px bg-white/10" />

        <!-- Work sessions count (quick edit) -->
        <div
          role="none"
          class="flex items-center justify-between gap-3 px-4 py-3"
          @click.stop
          @pointerdown.stop
        >
          <label
            for="menu-sessions-n"
            class="min-w-0 flex-1 text-sm leading-snug text-white/90"
          >
            Work sessions
            <span class="mt-0.5 block text-[11px] font-normal text-white/40">
              Before long break (1–{{ MAX_SESSIONS }})
            </span>
          </label>
          <input
            id="menu-sessions-n"
            v-model="sessionsDraft"
            type="number"
            :min="SESSIONS_RANGE.min"
            :max="SESSIONS_RANGE.max"
            inputmode="numeric"
            class="h-9 w-16 shrink-0 rounded-lg border border-white/15 bg-white/10 px-2 text-center text-sm font-semibold text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-tomato-400"
            aria-label="Number of work sessions before long break"
            @blur="commitSessions"
            @keydown="onSessionsKeydown"
            @click.stop
          />
        </div>

        <div class="h-px bg-white/10" />

        <button
          type="button"
          role="menuitem"
          class="w-full px-4 py-3.5 text-left text-sm text-white/90 transition-colors hover:bg-white/5"
          @click="onOpenDurations"
        >
          Customize durations…
        </button>

        <button
          type="button"
          role="menuitem"
          class="w-full px-4 py-3.5 text-left text-sm text-white/90 transition-colors hover:bg-white/5"
          @click="onOpenBackground"
        >
          Customize background…
        </button>

        <button
          type="button"
          role="menuitem"
          class="w-full px-4 py-3.5 text-left text-sm text-white/90 transition-colors hover:bg-white/5"
          @click="onOpenProfiles"
        >
          Profiles…
        </button>
      </div>
    </Teleport>
  </div>
</template>
