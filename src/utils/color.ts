/** Valid 6-digit hex color including leading # */
export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

/** Normalize user input toward #rrggbb when possible */
export function normalizeHexInput(raw: string): string {
  let v = raw.trim()
  if (!v.startsWith('#')) v = `#${v}`
  return v
}
