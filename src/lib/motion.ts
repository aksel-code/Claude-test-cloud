/**
 * Motion and haptics.
 *
 * `prefers-reduced-motion` is honoured everywhere, including inside Konva —
 * canvas tweens don't go through CSS, so they have to check this explicitly.
 * Users can also force reduce-motion on in Settings regardless of the OS.
 */

let override: boolean | null = null

const query = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null

/** Settings pushes the user's explicit choice here; null means "follow the OS". */
export function setMotionOverride(value: boolean | null): void {
  override = value
}

export function prefersReducedMotion(): boolean {
  if (override !== null) return override
  return query?.matches ?? false
}

/** Duration in ms, collapsed to ~0 when motion is reduced. */
export function dur(ms: number): number {
  return prefersReducedMotion() ? 0.001 : ms / 1000
}

export function onMotionChange(fn: () => void): () => void {
  if (!query) return () => {}
  query.addEventListener('change', fn)
  return () => query.removeEventListener('change', fn)
}

/* ---------------------------------------------------------------- haptics */

let hapticsOn = true
export function setHapticsEnabled(on: boolean): void {
  hapticsOn = on
}

type Haptic = 'tap' | 'place' | 'snap' | 'delete'

const PATTERNS: Record<Haptic, number | number[]> = {
  tap: 8,
  place: [0, 12, 28, 8],
  snap: 5,
  delete: [0, 18, 40, 18],
}

/**
 * Vibration is Android-only in practice — iOS Safari has never shipped it.
 * Treated as pure garnish: nothing depends on it firing.
 */
export function haptic(kind: Haptic): void {
  if (!hapticsOn || prefersReducedMotion()) return
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try { navigator.vibrate(PATTERNS[kind]) } catch { /* blocked by permissions policy */ }
}

/** Spring easing matched to the CSS `--ease-spring` used in the chrome. */
export function springEase(t: number): number {
  return 1 - Math.pow(2, -10 * t) * Math.cos(((t * 10 - 0.75) * (2 * Math.PI)) / 3)
}
