const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Sortable-ish id: base36 millisecond timestamp + randomness. Sorting by id
 * roughly equals sorting by creation time, which is handy when debugging the
 * element array by eye.
 */
export function uid(prefix = ''): string {
  const t = Date.now().toString(36)
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let r = ''
  for (const b of bytes) r += ALPHABET[b % 36]
  return `${prefix}${t}${r}`
}

/**
 * Deterministic 32-bit hash. Used to derive per-element "handmade" jitter so a
 * page looks the same every time it renders instead of twitching on re-mount.
 */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Stable pseudo-random in [0,1) from a seed string plus a channel salt. */
export function seededRandom(seed: string, channel = 0): number {
  let h = hashString(seed) ^ Math.imul(channel + 1, 2654435761)
  h ^= h >>> 15
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

/** Stable value in [-range, range] from a seed. */
export function seededSpread(seed: string, range: number, channel = 0): number {
  return (seededRandom(seed, channel) * 2 - 1) * range
}
