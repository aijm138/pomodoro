import { onMounted, onUnmounted, ref } from 'vue'

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
  webkitRequestFullScreen?: () => Promise<void> | void
  msRequestFullscreen?: () => Promise<void> | void
}

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
  webkitCancelFullScreen?: () => Promise<void> | void
  msExitFullscreen?: () => Promise<void> | void
  msFullscreenElement?: Element | null
}

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument
  return (
    document.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.msFullscreenElement ??
    null
  )
}

async function requestFullscreen(el: HTMLElement): Promise<void> {
  const node = el as FullscreenElement
  if (typeof node.requestFullscreen === 'function') {
    await node.requestFullscreen()
    return
  }
  if (typeof node.webkitRequestFullscreen === 'function') {
    await node.webkitRequestFullscreen()
    return
  }
  if (typeof node.webkitRequestFullScreen === 'function') {
    await node.webkitRequestFullScreen()
    return
  }
  if (typeof node.msRequestFullscreen === 'function') {
    await node.msRequestFullscreen()
  }
}

async function exitFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument
  if (typeof document.exitFullscreen === 'function' && document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }
  if (typeof doc.webkitExitFullscreen === 'function' && doc.webkitFullscreenElement) {
    await doc.webkitExitFullscreen()
    return
  }
  if (typeof doc.webkitCancelFullScreen === 'function' && doc.webkitFullscreenElement) {
    await doc.webkitCancelFullScreen()
    return
  }
  if (typeof doc.msExitFullscreen === 'function' && doc.msFullscreenElement) {
    await doc.msExitFullscreen()
  }
}

/**
 * Browser Fullscreen API helper.
 * Targets `document.documentElement` so the whole app fills the screen.
 */
export function useFullscreen() {
  const isFullscreen = ref(false)

  function sync(): void {
    isFullscreen.value = getFullscreenElement() !== null
  }

  async function enterFullscreen(): Promise<void> {
    try {
      if (getFullscreenElement()) {
        isFullscreen.value = true
        return
      }
      await requestFullscreen(document.documentElement)
      sync()
    } catch (err) {
      console.warn('Could not enter fullscreen:', err)
      sync()
    }
  }

  async function exitFullscreenMode(): Promise<void> {
    try {
      if (!getFullscreenElement()) {
        isFullscreen.value = false
        return
      }
      await exitFullscreen()
      sync()
    } catch (err) {
      console.warn('Could not exit fullscreen:', err)
      sync()
    }
  }

  async function toggleFullscreen(): Promise<void> {
    if (isFullscreen.value) {
      await exitFullscreenMode()
    } else {
      await enterFullscreen()
    }
  }

  onMounted(() => {
    sync()
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    document.addEventListener('MSFullscreenChange', sync)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', sync)
    document.removeEventListener('webkitfullscreenchange', sync)
    document.removeEventListener('MSFullscreenChange', sync)
  })

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen: exitFullscreenMode,
    toggleFullscreen,
  }
}
