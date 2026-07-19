import { onMounted, onUnmounted, ref } from 'vue'

/** Viewport threshold for the minimal timer-only layout */
export const COMPACT_VIEWPORT_PX = 414

/**
 * True when the browser viewport is smaller than 414×414
 * (either width or height below the threshold).
 * Used to show only the timer + Start/Pause on tiny windows / widgets.
 */
export function useCompactViewport() {
  const isCompact = ref(false)

  function update(): void {
    isCompact.value =
      window.innerWidth < COMPACT_VIEWPORT_PX ||
      window.innerHeight < COMPACT_VIEWPORT_PX
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return { isCompact }
}
