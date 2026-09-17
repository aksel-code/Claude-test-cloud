/**
 * Washi tape.
 *
 * Two details do all the work here. First, the strip is never a rectangle: the
 * long edges wobble and the ends are torn, generated deterministically from the
 * element id so a given piece of tape always tears the same way. Second, it is
 * genuinely semi-transparent, so whatever it is stuck over shows through —
 * that's the whole reason tape reads as tape.
 */
import { seededRandom } from '@/lib/id'
import { svgScope } from '@/lib/svg'

export interface TapeSpec {
  id: string
  name: string
  /** Default strip colour. Users can override per element. */
  color: string
  /** Base opacity. Paper tape sits ~0.8; cellophane-ish ones lower. */
  alpha: number
  /** Pattern markup for a 40x40 tile, or null for a plain strip. */
  tile: ((color: string) => string) | null
  /** Whether the ends tear raggedly (paper) or cut cleanly (plastic). */
  torn: boolean
}

const ink = (c: string, o: number) => `<rect width="40" height="40" fill="${c}" opacity="${o}"/>`

export const TAPES: TapeSpec[] = [
  {
    id: 'plain', name: 'Plain', color: '#E8D9B8', alpha: 0.82, torn: true,
    tile: null,
  },
  {
    id: 'stripe', name: 'Stripes', color: '#C8674A', alpha: 0.78, torn: true,
    tile: (c) => `${ink(c, 0.22)}<path d="M-10 40 30 0M0 50 40 10M10 60 50 20" stroke="${c}" stroke-width="9" opacity="0.85"/>`,
  },
  {
    id: 'dots', name: 'Dots', color: '#7D98B3', alpha: 0.8, torn: true,
    tile: (c) => `${ink(c, 0.20)}<circle cx="10" cy="10" r="4" fill="${c}"/><circle cx="30" cy="30" r="4" fill="${c}"/>`,
  },
  {
    id: 'gingham', name: 'Gingham', color: '#8FA58A', alpha: 0.8, torn: true,
    tile: (c) => `<rect width="40" height="40" fill="${c}" opacity="0.18"/>
      <rect width="20" height="40" fill="${c}" opacity="0.30"/>
      <rect width="40" height="20" fill="${c}" opacity="0.30"/>`,
  },
  {
    id: 'grid', name: 'Grid', color: '#8A8377', alpha: 0.72, torn: true,
    tile: (c) => `${ink(c, 0.10)}<path d="M0 0H40M0 20H40M0 0V40M20 0V40" stroke="${c}" stroke-width="2" opacity="0.65"/>`,
  },
  {
    id: 'floral', name: 'Floral', color: '#E4A9A0', alpha: 0.86, torn: true,
    tile: (c) => `${ink(c, 0.26)}
      <g fill="${c}" opacity="0.9">
        ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="12" cy="6" rx="3.4" ry="5.2" transform="rotate(${a} 12 12)"/>`).join('')}
        ${[36, 108, 180, 252, 324].map((a) => `<ellipse cx="30" cy="26" rx="3" ry="4.6" transform="rotate(${a} 30 32)"/>`).join('')}
      </g>
      <circle cx="12" cy="12" r="2.2" fill="#D9A441"/><circle cx="30" cy="32" r="2" fill="#D9A441"/>`,
  },
  {
    id: 'confetti', name: 'Confetti', color: '#D9A441', alpha: 0.82, torn: true,
    tile: (c) => `${ink(c, 0.16)}
      <rect x="6" y="8" width="7" height="3" rx="1.5" fill="${c}" transform="rotate(-24 9 9)"/>
      <rect x="24" y="4" width="6" height="3" rx="1.5" fill="#C8674A" opacity=".8" transform="rotate(38 27 5)"/>
      <rect x="14" y="26" width="7" height="3" rx="1.5" fill="#7D98B3" opacity=".8" transform="rotate(12 17 27)"/>
      <rect x="30" y="30" width="6" height="3" rx="1.5" fill="${c}" transform="rotate(-50 33 31)"/>`,
  },
  {
    id: 'kraft', name: 'Kraft', color: '#B58D5F', alpha: 0.92, torn: true,
    tile: (c) => `${ink(c, 0.6)}<path d="M0 8h40M0 22h40M0 34h40" stroke="#6F5236" stroke-width="1" opacity="0.22"/>`,
  },
  {
    id: 'cello', name: 'Cellophane', color: '#CFDDE8', alpha: 0.42, torn: false,
    tile: (c) => `${ink(c, 0.5)}<path d="M-10 40 30 0" stroke="#FFFFFF" stroke-width="12" opacity="0.35"/>`,
  },
  {
    id: 'ink', name: 'Ink wash', color: '#2B2A28', alpha: 0.24, torn: true,
    tile: null,
  },
]

const byId = new Map(TAPES.map((t) => [t.id, t]))
export function tapeSpec(id: string): TapeSpec {
  return byId.get(id) ?? TAPES[0]
}

/**
 * Builds the strip outline. `seed` drives the tear so each piece of tape on a
 * page is individually ragged but stable across renders.
 */
function stripPath(w: number, h: number, seed: string, torn: boolean): string {
  const amp = h * 0.05
  const pts: string[] = []
  const steps = Math.max(6, Math.round(w / 26))

  // Top edge, left to right.
  pts.push(`M0 ${(amp * seededRandom(seed, 100)).toFixed(1)}`)
  for (let i = 1; i <= steps; i++) {
    const x = (w * i) / steps
    const y = amp * seededRandom(seed, i)
    pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`)
  }

  // Right end: torn = a jagged vertical, clean = a straight edge.
  if (torn) {
    const teeth = 5
    for (let i = 1; i <= teeth; i++) {
      const y = (h * i) / teeth
      const x = w - seededRandom(seed, 50 + i) * (h * 0.16)
      pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`)
    }
  } else {
    pts.push(`L${w} ${h}`)
  }

  // Bottom edge, right to left.
  for (let i = steps; i >= 0; i--) {
    const x = (w * i) / steps
    const y = h - amp * seededRandom(seed, 200 + i)
    pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`)
  }

  if (torn) {
    const teeth = 5
    for (let i = teeth; i >= 1; i--) {
      const y = (h * (i - 1)) / teeth
      const x = seededRandom(seed, 70 + i) * (h * 0.16)
      pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`)
    }
  }

  return `${pts.join(' ')} Z`
}

/** Complete SVG for one strip of tape at the given element size. */
export function tapeSvg(spec: TapeSpec, color: string, w: number, h: number, seed: string): string {
  const width = Math.max(24, Math.round(w))
  const height = Math.max(12, Math.round(h))
  const path = stripPath(width, height, seed, spec.torn)
  const k = svgScope('tape', spec.id, color, width, height, seed)

  // The tile is authored at 40x40. Scale it so roughly two repeats fit across
  // the strip: a fixed tile looks like wallpaper on a wide piece of tape and
  // like a solid block on a narrow one.
  const tileScale = Math.min(1.2, Math.max(0.34, height / 88))

  const fill = spec.tile
    ? `<defs><pattern id="t-${k}" width="40" height="40" patternUnits="userSpaceOnUse"
         patternTransform="scale(${tileScale.toFixed(3)})">${spec.tile(color)}</pattern></defs>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${fill}
  <defs>
    <linearGradient id="sheen-${k}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.10"/>
    </linearGradient>
  </defs>
  <g opacity="${spec.alpha}">
    <path d="${path}" fill="${spec.tile ? `url(#t-${k})` : color}"/>
    <path d="${path}" fill="url(#sheen-${k})"/>
  </g>
  <path d="${path}" fill="none" stroke="${color}" stroke-width="1" opacity="0.25"/>
</svg>`
}

export function tapeCacheKey(patternId: string, color: string, w: number, h: number, seed: string): string {
  // Quantised so a drag doesn't re-rasterise on every pointermove.
  return `tp:${patternId}:${color}:${Math.round(w / 8)}:${Math.round(h / 4)}:${seed}`
}

/** CSS-only approximation for the tape picker swatches. */
export function tapeCss(spec: TapeSpec, color: string): string {
  switch (spec.id) {
    case 'stripe':
      return `repeating-linear-gradient(45deg, ${color} 0 6px, ${color}44 6px 12px)`
    case 'dots':
      return `radial-gradient(${color} 1.6px, ${color}33 1.7px) 0 0/8px 8px`
    case 'gingham':
      return `linear-gradient(${color}55 50%, transparent 50%) 0 0/100% 10px,
              linear-gradient(90deg, ${color}55 50%, ${color}22 50%) 0 0/10px 100%`
    case 'grid':
      return `linear-gradient(${color}77 1px, transparent 1px) 0 0/8px 8px,
              linear-gradient(90deg, ${color}77 1px, ${color}1a 1px) 0 0/8px 8px`
    case 'floral':
      return `radial-gradient(${color} 2px, transparent 2.2px) 0 0/11px 11px, ${color}33`
    case 'confetti':
      return `radial-gradient(${color} 1.4px, transparent 1.5px) 0 0/9px 9px,
              radial-gradient(#7D98B3 1.2px, transparent 1.3px) 4px 5px/9px 9px, ${color}22`
    case 'cello':
      return `linear-gradient(120deg, #ffffff88, ${color}55)`
    default:
      return color
  }
}
