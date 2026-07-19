/** Format total seconds as MM:SS with leading zeros */
export function formatTime(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
