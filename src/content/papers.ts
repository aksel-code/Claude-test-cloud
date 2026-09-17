import type { BackgroundKind, PageBackground } from '@/lib/types'
import { svgScope } from '@/lib/svg'

/**
 * Page backgrounds are generated as one full-page SVG and drawn as a single
 * Konva image. That's one draw call instead of ~700 grid lines, it exports at
 * any resolution without re-deriving anything, and the fibre/wash textures come
 * free from SVG filters.
 */

export interface PaperSpec {
  kind: BackgroundKind
  name: string
  defaultColor: string
  defaultPattern: string
}

export const PAPERS: PaperSpec[] = [
  { kind: 'cream',      name: 'Plain cream', defaultColor: '#FAF6EE', defaultPattern: '#2B2A28' },
  { kind: 'dotted',     name: 'Dotted',      defaultColor: '#FAF6EE', defaultPattern: '#B9AE9B' },
  { kind: 'lined',      name: 'Lined',       defaultColor: '#FCFAF4', defaultPattern: '#B7C6D2' },
  { kind: 'grid',       name: 'Grid',        defaultColor: '#FAF6EE', defaultPattern: '#C9BFAC' },
  { kind: 'kraft',      name: 'Kraft',       defaultColor: '#C9A882', defaultPattern: '#8A6C4C' },
  { kind: 'watercolor', name: 'Watercolour', defaultColor: '#FBF7F0', defaultPattern: '#8FA58A' },
  { kind: 'custom',     name: 'Custom',      defaultColor: '#F2DCC4', defaultPattern: '#2B2A28' },
]

export const DEFAULT_BACKGROUND: PageBackground = {
  kind: 'cream',
  color: '#FAF6EE',
  patternColor: '#B9AE9B',
}

export function paperSpec(kind: BackgroundKind): PaperSpec {
  return PAPERS.find((p) => p.kind === kind) ?? PAPERS[0]
}

/** Slightly darken a hex colour — used for page edges and shadowed folds. */
export function shade(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  const num = parseInt(full, 16)
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const r = clamp(((num >> 16) & 255) * (1 - amount))
  const g = clamp(((num >> 8) & 255) * (1 - amount))
  const b = clamp((num & 255) * (1 - amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** Relative luminance, for deciding whether ink or chalk reads better on a colour. */
export function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  const num = parseInt(full, 16)
  const chan = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * chan((num >> 16) & 255)
    + 0.7152 * chan((num >> 8) & 255)
    + 0.0722 * chan(num & 255)
}

/** Ink colour that stays legible on an arbitrary paper colour. */
export function readableInk(hex: string): string {
  return luminance(hex) > 0.42 ? '#2B2A28' : '#FBF7EF'
}

const grainFilter = (k: string) => `
  <filter id="grain-${k}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="n"/>
    <feColorMatrix type="saturate" values="0" in="n"/>
  </filter>`

// Long, fine strands rather than broad bands — broad bands read as wood, not paper.
const fibreFilter = (k: string) => `
  <filter id="fibre-${k}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.011 0.92" numOctaves="4" seed="7" result="n"/>
    <feColorMatrix type="saturate" values="0" in="n"/>
  </filter>`

/** Full-page SVG for a background. `w`/`h` are page units, not pixels. */
export function backgroundSvg(bg: PageBackground, w: number, h: number): string {
  const base = bg.color || paperSpec(bg.kind).defaultColor
  const ink = bg.patternColor || paperSpec(bg.kind).defaultPattern
  const k = svgScope('bg', bg.kind, base, ink, w, h)
  const layers: string[] = []

  switch (bg.kind) {
    case 'dotted': {
      layers.push(`
        <pattern id="p-${k}" width="48" height="48" patternUnits="userSpaceOnUse">
          <circle cx="24" cy="24" r="2.6" fill="${ink}" opacity="0.55"/>
        </pattern>
        <rect width="${w}" height="${h}" fill="url(#p-${k})"/>`)
      break
    }
    case 'grid': {
      layers.push(`
        <pattern id="p-${k}" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0 L0 0 0 48" fill="none" stroke="${ink}" stroke-width="1.4" opacity="0.5"/>
        </pattern>
        <rect width="${w}" height="${h}" fill="url(#p-${k})"/>`)
      break
    }
    case 'lined': {
      layers.push(`
        <pattern id="p-${k}" width="${w}" height="62" patternUnits="userSpaceOnUse">
          <line x1="0" y1="61" x2="${w}" y2="61" stroke="${ink}" stroke-width="1.6" opacity="0.6"/>
        </pattern>
        <rect y="90" width="${w}" height="${h - 90}" fill="url(#p-${k})"/>
        <line x1="118" y1="0" x2="118" y2="${h}" stroke="#D8A79C" stroke-width="2" opacity="0.65"/>`)
      break
    }
    case 'kraft': {
      layers.push(`
        <rect width="${w}" height="${h}" filter="url(#fibre-${k})" opacity="0.20"/>
        <rect width="${w}" height="${h}" fill="${shade(base, 0.12)}" opacity="0.16"/>`)
      break
    }
    case 'watercolor': {
      // Big soft washes, jittered so no two pages read as identical.
      const blobs = [
        { cx: 0.22, cy: 0.18, r: 0.42, c: '#8FA58A' },
        { cx: 0.82, cy: 0.30, r: 0.36, c: '#7D98B3' },
        { cx: 0.60, cy: 0.78, r: 0.44, c: '#D9A441' },
        { cx: 0.16, cy: 0.86, r: 0.32, c: '#C8674A' },
      ]
      // The filter region defaults to the element bbox + 10%. A blur this wide
      // gets squared off at that boundary, which makes washes look like
      // rectangles — hence the explicit oversized region.
      const spread = Math.round(w * 0.085)
      layers.push(
        `<filter id="blur-${k}" x="-60%" y="-60%" width="220%" height="220%">
           <feGaussianBlur stdDeviation="${spread}"/>
         </filter>`,
        ...blobs.map(
          (b) =>
            `<ellipse cx="${b.cx * w}" cy="${b.cy * h}" rx="${b.r * w}" ry="${b.r * w * 0.82}"
               fill="${b.c}" opacity="0.34" filter="url(#blur-${k})"/>`,
        ),
      )
      break
    }
    case 'cream':
    case 'custom':
    default:
      break
  }

  // Grain last, multiplied over everything — this is what stops a flat fill
  // from reading as a screen rather than paper.
  const grainOpacity = bg.kind === 'kraft' ? 0.16 : 0.10
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${grainFilter(k)}${fibreFilter(k)}</defs>
  <rect width="${w}" height="${h}" fill="${base}"/>
  ${layers.join('\n')}
  <rect width="${w}" height="${h}" filter="url(#grain-${k})" opacity="${grainOpacity}" style="mix-blend-mode:multiply"/>
</svg>`
}

/** Cache key: background SVGs are expensive to rasterise, cheap to identify. */
export function backgroundKey(bg: PageBackground): string {
  return `bg:${bg.kind}:${bg.color}:${bg.patternColor ?? ''}`
}

/** Small CSS-only approximation, for swatches and thumbnails. */
export function backgroundCss(bg: PageBackground): string {
  const base = bg.color || paperSpec(bg.kind).defaultColor
  const ink = bg.patternColor || paperSpec(bg.kind).defaultPattern
  switch (bg.kind) {
    case 'dotted':
      return `radial-gradient(${ink} 1.2px, transparent 1.3px) 0 0/12px 12px, ${base}`
    case 'grid':
      return `linear-gradient(${ink} 1px, transparent 1px) 0 0/12px 12px,
              linear-gradient(90deg, ${ink} 1px, transparent 1px) 0 0/12px 12px, ${base}`
    case 'lined':
      return `linear-gradient(transparent 11px, ${ink} 11px, ${ink} 12px, transparent 12px) 0 0/100% 12px, ${base}`
    case 'kraft':
      return `linear-gradient(115deg, ${shade(base, 0.08)}, ${base} 40%, ${shade(base, 0.12)})`
    case 'watercolor':
      return `radial-gradient(60% 60% at 20% 20%, #8FA58A55, transparent),
              radial-gradient(55% 55% at 85% 35%, #7D98B355, transparent),
              radial-gradient(60% 60% at 60% 85%, #D9A44155, transparent), ${base}`
    default:
      return base
  }
}
