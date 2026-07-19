/** Round and clamp a numeric value; return fallback if not finite */
export function clamp(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}
