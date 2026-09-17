/**
 * Fonts offered for journal content. All self-hosted (see public/fonts) so the
 * app renders identically offline — a PWA that needs a CDN isn't really offline.
 *
 * `stack` is what Konva writes into ctx.font, so it must be a valid CSS family
 * list. `baselineNudge` corrects for handwriting faces whose glyphs sit high or
 * low in the em box; without it, mixed-font pages look misaligned.
 */
export interface FontSpec {
  id: string
  name: string
  stack: string
  category: 'hand' | 'serif' | 'sans'
  /** Visual size correction — Caveat at 40px reads much smaller than Inter at 40px. */
  scale: number
  baselineNudge: number
  weight: number
}

export const FONTS: FontSpec[] = [
  {
    id: 'caveat',
    name: 'Caveat',
    stack: 'Caveat, cursive',
    category: 'hand',
    scale: 1.18,
    baselineNudge: 0.02,
    weight: 500,
  },
  {
    id: 'patrick',
    name: 'Patrick Hand',
    stack: '"Patrick Hand", cursive',
    category: 'hand',
    scale: 1.0,
    baselineNudge: 0,
    weight: 400,
  },
  {
    id: 'homemade',
    name: 'Homemade Apple',
    stack: '"Homemade Apple", cursive',
    category: 'hand',
    scale: 0.82,
    baselineNudge: 0.06,
    weight: 400,
  },
  {
    id: 'kalam',
    name: 'Kalam',
    stack: 'Kalam, cursive',
    category: 'hand',
    scale: 0.95,
    baselineNudge: 0.01,
    weight: 400,
  },
  {
    id: 'gloria',
    name: 'Gloria Hallelujah',
    stack: '"Gloria Hallelujah", cursive',
    category: 'hand',
    scale: 0.88,
    baselineNudge: 0.04,
    weight: 400,
  },
  {
    id: 'fraunces',
    name: 'Fraunces',
    stack: 'Fraunces, Georgia, serif',
    category: 'serif',
    scale: 1.0,
    baselineNudge: 0,
    weight: 500,
  },
  {
    id: 'inter',
    name: 'Inter',
    stack: 'Inter, system-ui, sans-serif',
    category: 'sans',
    scale: 0.96,
    baselineNudge: 0,
    weight: 400,
  },
]

export const DEFAULT_FONT = 'caveat'

const byId = new Map(FONTS.map((f) => [f.id, f]))

export function getFont(id: string): FontSpec {
  return byId.get(id) ?? byId.get(DEFAULT_FONT)!
}

/**
 * Canvas text does not participate in CSS font loading, so a page drawn before
 * the webfont arrives silently falls back to a system face. We wait for the
 * faces we actually use, then let callers force a redraw.
 */
export async function ensureFontsReady(): Promise<void> {
  if (!('fonts' in document)) return
  const wanted = FONTS.map((f) => {
    const family = f.stack.split(',')[0].trim()
    return `${f.weight} 40px ${family}`
  })
  await Promise.allSettled(wanted.map((spec) => document.fonts.load(spec, 'Ag')))
  try { await document.fonts.ready } catch { /* non-fatal */ }
}
