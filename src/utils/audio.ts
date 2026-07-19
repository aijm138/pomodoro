/**
 * Timer audio using MP3 assets from /public.
 * - Ticking: seamless loop via Web Audio API (AudioBufferSourceNode)
 * - Going off: one-shot HTMLAudioElement alarm when a session ends
 *
 * HTMLAudioElement.loop often inserts a noticeable gap on MP3s
 * (decoder padding / encoder delay). BufferSource.loop is gapless.
 */

import {
  COMPLETION_SOUND_SRC,
  GOING_OFF_SOUND_SRC,
  TICKING_SOUND_SRC,
} from '@/constants/pomodoro'

let audioCtx: AudioContext | null = null
let tickingBuffer: AudioBuffer | null = null
let tickingSource: AudioBufferSourceNode | null = null
let tickingGain: GainNode | null = null
let tickingLoadPromise: Promise<AudioBuffer | null> | null = null
let tickingDesired = false

let goingOffAudio: HTMLAudioElement | null = null
let completionAudio: HTMLAudioElement | null = null

type AudioContextConstructor = typeof AudioContext

function getAudioContextCtor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor
    webkitAudioContext?: AudioContextConstructor
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx
  const Ctor = getAudioContextCtor()
  if (!Ctor) return null
  try {
    audioCtx = new Ctor()
    return audioCtx
  } catch {
    return null
  }
}

async function resumeContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      /* still locked */
    }
  }
}

/**
 * Trim near-silent samples from both ends so the loop point
 * doesn't include encoder padding / trailing silence.
 */
function trimSilence(buffer: AudioBuffer, threshold = 0.008): AudioBuffer {
  const ctx = getAudioContext()
  if (!ctx) return buffer

  const channels = buffer.numberOfChannels
  const length = buffer.length
  if (length < 2) return buffer

  // Merge peak across channels for silence detection
  const peaks = new Float32Array(length)
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(data[i])
      if (abs > peaks[i]) peaks[i] = abs
    }
  }

  let start = 0
  while (start < length && peaks[start] < threshold) start++

  let end = length - 1
  while (end > start && peaks[end] < threshold) end--

  // Keep a tiny pad so we don't clip the first/last transient
  const pad = Math.min(64, Math.floor((end - start) * 0.01))
  start = Math.max(0, start - pad)
  end = Math.min(length - 1, end + pad)

  const newLength = end - start + 1
  if (newLength < 256 || newLength >= length) {
    // Nothing meaningful to trim, or would drop almost everything
    return buffer
  }

  const trimmed = ctx.createBuffer(
    channels,
    newLength,
    buffer.sampleRate,
  )
  for (let c = 0; c < channels; c++) {
    const src = buffer.getChannelData(c)
    trimmed.copyToChannel(src.subarray(start, end + 1), c)
  }
  return trimmed
}

async function loadTickingBuffer(): Promise<AudioBuffer | null> {
  if (tickingBuffer) return tickingBuffer
  if (tickingLoadPromise) return tickingLoadPromise

  tickingLoadPromise = (async () => {
    const ctx = getAudioContext()
    if (!ctx) return null
    try {
      const res = await fetch(TICKING_SOUND_SRC)
      if (!res.ok) {
        console.warn('Failed to fetch ticking sound:', res.status)
        return null
      }
      const raw = await res.arrayBuffer()
      const decoded = await ctx.decodeAudioData(raw.slice(0))
      tickingBuffer = trimSilence(decoded)
      return tickingBuffer
    } catch (err) {
      console.warn('Failed to decode ticking sound:', err)
      return null
    } finally {
      tickingLoadPromise = null
    }
  })()

  return tickingLoadPromise
}

function getGoingOffAudio(): HTMLAudioElement {
  if (!goingOffAudio) {
    goingOffAudio = new Audio(GOING_OFF_SOUND_SRC)
    goingOffAudio.preload = 'auto'
    goingOffAudio.loop = false
    goingOffAudio.volume = 0.9
  }
  return goingOffAudio
}

function getCompletionAudio(): HTMLAudioElement {
  if (!completionAudio) {
    completionAudio = new Audio(COMPLETION_SOUND_SRC)
    completionAudio.preload = 'auto'
    completionAudio.loop = false
    completionAudio.volume = 0.9
  }
  return completionAudio
}

function playOneShot(audio: HTMLAudioElement, label: string): void {
  try {
    audio.muted = false
    audio.pause()
    try {
      audio.currentTime = 0
    } catch {
      /* ignore */
    }
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      void playPromise.catch((err: unknown) => {
        console.warn(`${label} failed to play:`, err)
      })
    }
  } catch (err) {
    console.warn(`${label} error:`, err)
  }
}

function stopTickingSource(): void {
  if (!tickingSource) return
  try {
    tickingSource.onended = null
    tickingSource.stop()
  } catch {
    /* already stopped */
  }
  try {
    tickingSource.disconnect()
  } catch {
    /* optional */
  }
  tickingSource = null
}

function stopTickingGain(): void {
  if (!tickingGain) return
  try {
    tickingGain.disconnect()
  } catch {
    /* optional */
  }
  tickingGain = null
}

/**
 * Start a seamless looping BufferSource from the decoded tick clip.
 * Must be called (or preceded by unlock) from a user gesture once.
 */
function playTickingFromBuffer(buffer: AudioBuffer): void {
  const ctx = getAudioContext()
  if (!ctx || !tickingDesired) return

  stopTickingSource()
  stopTickingGain()

  const gain = ctx.createGain()
  gain.gain.value = 0.6
  gain.connect(ctx.destination)
  tickingGain = gain

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  // Full buffer loop — silence already trimmed for a tight join
  source.loopStart = 0
  source.loopEnd = buffer.duration
  source.connect(gain)
  source.start(0)
  tickingSource = source
}

/**
 * Call from a click/keydown handler so the AudioContext can resume
 * and the going-off element is warmed under a user gesture.
 */
export function unlockAudio(): void {
  try {
    const ctx = getAudioContext()
    if (ctx) {
      void resumeContext(ctx)
    }
    // Kick off decode early so Start can play immediately next time
    void loadTickingBuffer()
    getGoingOffAudio()
    getCompletionAudio()
  } catch {
    /* optional */
  }
}

/** Start seamless looping tick while timer runs */
export function startTickingSound(): void {
  tickingDesired = true

  try {
    const ctx = getAudioContext()
    if (!ctx) {
      console.warn('Web Audio API unavailable for ticking sound')
      return
    }

    void (async () => {
      await resumeContext(ctx)
      const buffer = await loadTickingBuffer()
      if (!buffer || !tickingDesired) return
      // Avoid stacking sources if already looping
      if (tickingSource) return
      playTickingFromBuffer(buffer)
    })()
  } catch (err) {
    console.warn('Ticking sound error:', err)
  }
}

/** Stop looping tick */
export function stopTickingSound(): void {
  tickingDesired = false
  stopTickingSource()
  stopTickingGain()
}

/** One-shot session-end alarm */
export function playGoingOffSound(): void {
  stopTickingSound()
  playOneShot(getGoingOffAudio(), 'Going-off sound')
}

/** One-shot work-session completion jingle */
export function playCompletionSound(): void {
  stopTickingSound()
  playOneShot(getCompletionAudio(), 'Completion sound')
}

/** Tear down elements (e.g. on unmount) */
export function disposeAudio(): void {
  stopTickingSound()
  try {
    if (goingOffAudio) {
      goingOffAudio.pause()
      goingOffAudio = null
    }
    if (completionAudio) {
      completionAudio.pause()
      completionAudio = null
    }
    tickingBuffer = null
    tickingLoadPromise = null
    if (audioCtx) {
      void audioCtx.close().catch(() => {
        /* optional */
      })
      audioCtx = null
    }
  } catch {
    /* optional */
  }
}
