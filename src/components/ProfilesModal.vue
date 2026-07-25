<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PomodoroProfile } from '@/types/pomodoro'

const props = defineProps<{
  open: boolean
  profiles: PomodoroProfile[]
  activeProfileId: string | null
  newProfileName: string
  error: string
}>()

const emit = defineEmits<{
  close: []
  'update:newProfileName': [value: string]
  switch: [id: string]
  create: []
  'save-current': []
  rename: [id: string, name: string]
  delete: [id: string]
}>()

/** Which profile row is being renamed (id), or null */
const renamingId = ref<string | null>(null)
const renameDraft = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      renamingId.value = null
      renameDraft.value = ''
    }
  },
)

const canDelete = computed(() => props.profiles.length > 1)

function summary(profile: PomodoroProfile): string {
  const short =
    profile.shortBreakMinutes === 0
      ? 'no short'
      : `${profile.shortBreakMinutes}m short`
  const long =
    profile.longBreakMinutes === 0
      ? 'no long'
      : `${profile.longBreakMinutes}m long`
  return `${profile.sessionsBeforeLongBreak}× ${profile.workMinutes}m · ${short} · ${long}`
}

function startRename(profile: PomodoroProfile): void {
  renamingId.value = profile.id
  renameDraft.value = profile.name
}

function cancelRename(): void {
  renamingId.value = null
  renameDraft.value = ''
}

function commitRename(): void {
  const id = renamingId.value
  if (!id) return
  emit('rename', id, renameDraft.value)
  renamingId.value = null
  renameDraft.value = ''
}

function onNewNameInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:newProfileName', target.value)
}
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="profiles-title"
    @click.self="emit('close')"
  >
    <div
      class="modal-panel max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:max-w-md sm:rounded-3xl"
    >
      <div
        class="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-900/95 px-5 py-4 backdrop-blur"
      >
        <h2 id="profiles-title" class="text-lg font-semibold text-white">
          Profiles
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

      <div class="space-y-5 px-5 py-5">
        <p class="text-sm leading-relaxed text-white/50">
          Save durations and session breakdowns for different workflows (e.g.
          Web development vs Outreach). Switching loads that profile and resets
          the cycle. Sound and background stay global.
        </p>

        <ul class="flex flex-col gap-2.5" role="list">
          <li
            v-for="profile in profiles"
            :key="profile.id"
            class="rounded-2xl border px-3.5 py-3 transition-colors"
            :class="
              profile.id === activeProfileId
                ? 'border-tomato-400/40 bg-tomato-500/10'
                : 'border-white/10 bg-white/[0.04]'
            "
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <template v-if="renamingId === profile.id">
                  <form
                    class="flex flex-col gap-2 sm:flex-row sm:items-center"
                    @submit.prevent="commitRename"
                  >
                    <input
                      v-model="renameDraft"
                      type="text"
                      maxlength="40"
                      class="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-tomato-400"
                      aria-label="Rename profile"
                      @keydown.esc.prevent="cancelRename"
                    />
                    <div class="flex shrink-0 gap-1.5">
                      <button
                        type="submit"
                        class="rounded-lg bg-tomato-500 px-3 py-2 text-xs font-semibold text-white hover:bg-tomato-600"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
                        @click="cancelRename"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </template>
                <template v-else>
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="truncate text-sm font-semibold text-white">
                      {{ profile.name }}
                    </p>
                    <span
                      v-if="profile.id === activeProfileId"
                      class="shrink-0 rounded-full bg-tomato-500/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tomato-200"
                    >
                      active
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-white/45">
                    {{ summary(profile) }}
                  </p>
                </template>
              </div>
            </div>

            <div
              v-if="renamingId !== profile.id"
              class="mt-3 flex flex-wrap gap-2"
            >
              <button
                v-if="profile.id !== activeProfileId"
                type="button"
                class="rounded-lg bg-tomato-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-tomato-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-300"
                @click="emit('switch', profile.id)"
              >
                Switch
              </button>
              <button
                v-else
                type="button"
                class="rounded-lg border border-tomato-400/40 bg-tomato-500/20 px-3 py-1.5 text-xs font-semibold text-tomato-100 transition-colors hover:bg-tomato-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-300"
                title="Reload this profile’s saved durations and notes"
                @click="emit('switch', profile.id)"
              >
                Reload
              </button>
              <button
                type="button"
                class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-400"
                @click="startRename(profile)"
              >
                Rename
              </button>
              <button
                type="button"
                class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!canDelete"
                :title="
                  canDelete
                    ? `Delete ${profile.name}`
                    : 'Keep at least one profile'
                "
                @click="emit('delete', profile.id)"
              >
                Delete
              </button>
            </div>
          </li>
        </ul>

        <div class="h-px bg-white/10" />

        <!-- Save current tweaks into active profile -->
        <div>
          <button
            type="button"
            class="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-400"
            @click="emit('save-current')"
          >
            Save current settings to active profile
          </button>
          <p class="mt-1.5 text-xs text-white/40">
            Updates the active profile with today’s durations and session notes.
          </p>
        </div>

        <!-- Create new from current -->
        <form class="space-y-3" @submit.prevent="emit('create')">
          <label
            for="new-profile-name"
            class="block text-sm font-medium text-white/80"
          >
            Save current as new profile
          </label>
          <div class="flex gap-2">
            <input
              id="new-profile-name"
              :value="newProfileName"
              type="text"
              maxlength="40"
              placeholder="e.g. Web development"
              class="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-tomato-400"
              @input="onNewNameInput"
            />
            <button
              type="submit"
              class="shrink-0 rounded-xl bg-tomato-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-tomato-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-300"
            >
              Create
            </button>
          </div>
        </form>

        <p v-if="error" class="text-sm text-tomato-300" role="alert">
          {{ error }}
        </p>

        <button
          type="button"
          class="touch-target h-12 w-full rounded-xl border border-white/15 bg-white/5 font-medium text-white transition-colors hover:bg-white/10"
          @click="emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
