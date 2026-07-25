<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { WorkSessionProjection } from '@/types/pomodoro'

const props = defineProps<{
  /** One note per work session in the cycle */
  notes: string[]
  /** Currently active work session index (0-based), or -1 if on a break */
  activeSessionIndex: number
  /**
   * Projected end times for each work session (back-to-back assumption).
   * Length always matches notes / sessionsBeforeLongBreak.
   */
  sessionBreakdown?: WorkSessionProjection[]
}>()

const emit = defineEmits<{
  save: [notes: string[]]
}>()

/** Working copy so typing doesn't write through until Save */
const draft = ref<string[]>([...props.notes])

/** When true, all note fields are unlocked for editing */
const isEditing = ref(false)

/** Brief confirmation after Save */
const justSaved = ref(false)
let savedTimer: number | null = null

const sessionCount = computed(() => props.notes.length)

/** Lookup map: index → projection (safe when prop is missing / shorter) */
const breakdownByIndex = computed(() => {
  const map = new Map<number, WorkSessionProjection>()
  for (const item of props.sessionBreakdown ?? []) {
    map.set(item.index, item)
  }
  return map
})

function projectionFor(index: number): WorkSessionProjection | undefined {
  return breakdownByIndex.value.get(index)
}

watch(
  () => props.notes,
  (next) => {
    // Sync from parent when length changes or external hydrate
    // Don't overwrite fields the user is actively editing
    if (isEditing.value) {
      if (next.length !== draft.value.length) {
        // Resize while keeping in-progress text where possible
        const resized = next.map((_, i) => draft.value[i] ?? '')
        draft.value = resized
      }
      return
    }

    if (
      next.length !== draft.value.length ||
      next.some((n, i) => n !== draft.value[i])
    ) {
      draft.value = [...next]
    }
  },
  { deep: true },
)

/**
 * Pick which note to focus after Edit:
 * - first empty session (if any)
 * - otherwise the last work session
 * Caret is always placed at the end of that field's text.
 */
function resolveFocusIndex(): number {
  const notes = draft.value
  if (notes.length === 0) return 0
  const emptyIndex = notes.findIndex((n) => n.trim() === '')
  if (emptyIndex !== -1) return emptyIndex
  return notes.length - 1
}

async function focusNoteField(index: number): Promise<void> {
  await nextTick()
  const el = document.getElementById(
    `session-note-${index}`,
  ) as HTMLTextAreaElement | null
  if (!el) return
  el.focus()
  const len = el.value.length
  try {
    el.setSelectionRange(len, len)
  } catch {
    /* some browsers may throw if not focused yet */
  }
}

function startEdit(): void {
  isEditing.value = true
  void focusNoteField(resolveFocusIndex())
}

function clearNote(index: number): void {
  const copy = [...draft.value]
  copy[index] = ''
  draft.value = copy
  // Unlock all fields so the user can type a replacement right away
  isEditing.value = true
  void (async () => {
    await nextTick()
    const el = document.getElementById(
      `session-note-${index}`,
    ) as HTMLTextAreaElement | null
    if (!el) return
    el.focus()
  })()
}

function onInput(index: number, event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const copy = [...draft.value]
  copy[index] = target.value
  draft.value = copy
}

function save(): void {
  // Lock all fields; content stays visible
  isEditing.value = false
  emit(
    'save',
    draft.value.map((n) => n.trimEnd()),
  )
  justSaved.value = true
  if (savedTimer !== null) window.clearTimeout(savedTimer)
  savedTimer = window.setTimeout(() => {
    justSaved.value = false
    savedTimer = null
  }, 1600)
}

function isActive(index: number): boolean {
  return props.activeSessionIndex === index
}
</script>

<template>
  <section
    class="w-full max-w-md rounded-3xl border border-white/10 bg-black/45 px-5 py-6 shadow-2xl backdrop-blur-md sm:px-8 sm:py-7"
    aria-label="Session breakdown"
  >
    <header class="mb-5">
      <h2 class="text-base font-semibold tracking-tight text-white/95 sm:text-lg">
        Session Breakdown
      </h2>
      <p class="mt-1 text-xs leading-relaxed text-white/45 sm:text-sm">
        Plan each focus block and see when it ends if you run work and breaks
        back-to-back. Press
        <span class="text-white/60">Edit</span> to change notes, then
        <span class="text-white/60">Save</span> when you’re done.
      </p>
    </header>

    <ul class="flex flex-col gap-3" role="list">
      <li
        v-for="(_, index) in sessionCount"
        :key="index"
        class="rounded-2xl border px-3 py-3 transition-colors sm:px-3.5"
        :class="
          isActive(index)
            ? 'border-tomato-400/40 bg-tomato-500/10'
            : 'border-white/10 bg-white/[0.04]'
        "
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <label
            :for="`session-note-${index}`"
            class="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70"
          >
            <span
              class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              :class="
                isActive(index)
                  ? 'bg-tomato-500 text-white'
                  : 'bg-white/15 text-white/80'
              "
              aria-hidden="true"
            >
              {{ index + 1 }}
            </span>
            <span class="truncate">Work session {{ index + 1 }}</span>
            <span
              v-if="isActive(index)"
              class="shrink-0 rounded-full bg-tomato-500/30 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-tomato-200"
            >
              current
            </span>
          </label>

          <div class="flex shrink-0 items-center gap-2">
            <!-- Projected end time (or "done") -->
            <span
              v-if="projectionFor(index)"
              class="text-right text-[11px] font-medium normal-case tracking-normal sm:text-xs"
              :class="
                projectionFor(index)?.isDone
                  ? 'text-white/35'
                  : projectionFor(index)?.isCurrent
                    ? 'text-tomato-200'
                    : 'text-white/55'
              "
              :title="
                projectionFor(index)?.isDone
                  ? `Work session ${index + 1} completed`
                  : `Projected end if sessions run back-to-back`
              "
              :aria-label="
                projectionFor(index)?.isDone
                  ? `Work session ${index + 1} done`
                  : `Work session ${index + 1} ${projectionFor(index)?.display ?? ''}`
              "
            >
              {{ projectionFor(index)?.display }}
            </span>

            <button
              type="button"
              class="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 transition-colors hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              :aria-label="`Delete session ${index + 1} note`"
              @click="clearNote(index)"
            >
              Delete
            </button>
          </div>
        </div>

        <textarea
          :id="`session-note-${index}`"
          :value="draft[index] ?? ''"
          rows="2"
          maxlength="500"
          :readonly="!isEditing"
          :placeholder="
            isEditing
              ? 'What will you work on?'
              : 'No plan yet — press Edit'
          "
          class="w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed text-white/95 placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-400"
          :class="
            isEditing
              ? 'border-tomato-400/35 bg-black/40'
              : 'cursor-default border-white/10 bg-black/25 text-white/85'
          "
          :aria-readonly="!isEditing"
          @input="onInput(index, $event)"
        />
      </li>
    </ul>

    <div class="mt-5 flex items-center justify-between gap-3">
      <button
        type="button"
        class="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-400 disabled:cursor-default disabled:opacity-40"
        :disabled="isEditing"
        aria-label="Edit all session notes"
        @click="startEdit"
      >
        Edit
      </button>

      <div class="flex items-center gap-3">
        <span
          v-if="justSaved"
          class="text-xs font-medium text-break-light"
          role="status"
        >
          Saved
        </span>
        <button
          type="button"
          class="rounded-xl bg-tomato-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-tomato-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-tomato-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          @click="save"
        >
          Save
        </button>
      </div>
    </div>
  </section>
</template>
