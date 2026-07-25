/** Format total seconds as MM:SS with leading zeros */
export function formatTime(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Format a wall-clock Date as a short locale time string
 * (e.g. "3:42 PM" or "15:42" depending on the user's locale).
 */
export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}
