/**
 * Background-friendly timer tick worker.
 * Browsers throttle setInterval in hidden tabs; dedicated workers keep
 * firing more reliably so the main thread can re-sync from endTimestamp.
 */

let intervalId: ReturnType<typeof setInterval> | null = null

self.onmessage = (event: MessageEvent<{ type: 'start' | 'stop' }>) => {
  const { type } = event.data

  if (type === 'start') {
    if (intervalId !== null) return
    intervalId = setInterval(() => {
      self.postMessage({ type: 'tick', now: Date.now() })
    }, 250)
    // Immediate tick so UI updates without waiting a quarter-second
    self.postMessage({ type: 'tick', now: Date.now() })
    return
  }

  if (type === 'stop') {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

export {}
