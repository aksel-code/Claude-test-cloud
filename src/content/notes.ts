import type { NoteStyle } from '@/lib/types'
import { seededRandom } from '@/lib/id'
import { svgScope } from '@/lib/svg'
import { shade } from './papers'

/**
 * Note containers — sticky notes, ticket stubs, receipts and index cards.
 * Each is an SVG shape drawn behind the note's text on the canvas, so the
 * silhouette is real (a receipt genuinely has a zig-zag bottom) rather than a
 * rectangle with a picture of one.
 */

export interface NoteSpec {
  id: NoteStyle
  name: string
  defaultPaper: string
  defaultInk: string
  /** Suggested size in page units. */
  size: [number, number]
  /** Text inset as a fraction of width/height: [x, top, right, bottom]. */
  padding: [number, number, number, number]
  defaultFont: string
}

export const NOTES: NoteSpec[] = [
  {
    id: 'sticky', name: 'Sticky note', defaultPaper: '#FDF3B8', defaultInk: '#2B2A28',
    size: [280, 280], padding: [0.1, 0.12, 0.1, 0.12], defaultFont: 'patrick',
  },
  {
    id: 'ticket', name: 'Ticket stub', defaultPaper: '#F3D9C4', defaultInk: '#6F5236',
    size: [420, 180], padding: [0.09, 0.18, 0.28, 0.18], defaultFont: 'inter',
  },
  {
    id: 'receipt', name: 'Receipt', defaultPaper: '#FCFAF4', defaultInk: '#5A544C',
    size: [260, 400], padding: [0.12, 0.10, 0.12, 0.14], defaultFont: 'inter',
  },
  {
    id: 'index', name: 'Index card', defaultPaper: '#FBF7EF', defaultInk: '#2B2A28',
    size: [460, 300], padding: [0.08, 0.16, 0.08, 0.1], defaultFont: 'kalam',
  },
]

const byId = new Map(NOTES.map((n) => [n.id, n]))
export function noteSpec(id: NoteStyle): NoteSpec {
  return byId.get(id) ?? NOTES[0]
}

export function noteSvg(style: NoteStyle, paper: string, w: number, h: number, seed: string): string {
  const W = Math.max(40, Math.round(w))
  const H = Math.max(40, Math.round(h))
  const k = svgScope('note', style, paper, W, H, seed)
  const edge = shade(paper, 0.12)
  let defs = ''
  let shape = ''
  let detail = ''

  switch (style) {
    case 'sticky': {
      // The curl at the bottom-right is what sells a sticky note.
      const curl = Math.min(W, H) * 0.22
      shape = `<path d="M0 0H${W}V${H - curl}L${W - curl} ${H}H0Z" fill="${paper}"/>
        <path d="M${W} ${H - curl}L${W - curl} ${H}L${W - curl} ${H - curl}Z" fill="${shade(paper, 0.22)}"/>`
      detail = `<rect width="${W}" height="${H * 0.16}" fill="#ffffff" opacity="0.28"/>`
      break
    }
    case 'ticket': {
      // Real semicircular bites out of the top and bottom edges, punched with a
      // mask. A <circle fill="none"> draws nothing — it has to remove paper.
      const r = H * 0.14
      const notch = W * 0.7
      defs = `<mask id="m-${k}">
          <rect width="${W}" height="${H}" fill="#fff"/>
          <circle cx="${notch}" cy="0" r="${r}" fill="#000"/>
          <circle cx="${notch}" cy="${H}" r="${r}" fill="#000"/>
        </mask>`
      shape = `<rect width="${W}" height="${H}" fill="${paper}" mask="url(#m-${k})"/>`
      detail = `<g mask="url(#m-${k})">
        <path d="M${notch} ${r + 6}V${H - r - 6}" stroke="${edge}" stroke-width="2" stroke-dasharray="7 6"/>
        <rect x="${W * 0.78}" y="${H * 0.26}" width="${W * 0.13}" height="${H * 0.48}" rx="3" fill="${edge}" opacity="0.32"/>
        <path d="M${W * 0.06} ${H * 0.28}H${W * 0.5}M${W * 0.06} ${H * 0.46}H${W * 0.42}"
          stroke="${edge}" stroke-width="2.4" stroke-linecap="round" opacity="0.30"/>
        <rect width="${W}" height="${H * 0.1}" fill="#ffffff" opacity="0.25"/>
      </g>`
      break
    }
    case 'receipt': {
      // Zig-zag tear along the bottom, seeded so it stays put.
      const teeth = 11
      const step = W / teeth
      const depth = Math.max(8, H * 0.035)
      let zig = `M0 0H${W}V${H - depth}`
      for (let i = teeth; i >= 0; i--) {
        const x = step * i
        const y = H - (i % 2 === 0 ? 0 : depth) - seededRandom(seed, i) * 3
        zig += `L${x.toFixed(1)} ${y.toFixed(1)}`
      }
      zig += 'Z'
      shape = `<path d="${zig}" fill="${paper}"/>`
      detail = `<path d="M${W * 0.12} ${H * 0.07}H${W * 0.88}" stroke="${edge}" stroke-width="1.5" stroke-dasharray="3 4"/>
        <path d="M${W * 0.12} ${H * 0.86}H${W * 0.88}" stroke="${edge}" stroke-width="1.5" stroke-dasharray="3 4"/>`
      break
    }
    case 'index':
    default: {
      shape = `<rect width="${W}" height="${H}" rx="6" fill="${paper}"/>`
      detail = `<path d="M0 ${H * 0.16}H${W}" stroke="#D8A79C" stroke-width="2.5" opacity="0.75"/>
        ${Array.from({ length: Math.max(0, Math.floor((H * 0.84) / 46) - 1) }, (_, i) =>
          `<path d="M${W * 0.05} ${H * 0.16 + 46 * (i + 1)}H${W * 0.95}" stroke="#B7C6D2" stroke-width="1.6" opacity="0.7"/>`,
        ).join('')}
        <rect width="${W}" height="${H}" rx="6" fill="none" stroke="${edge}" stroke-width="1.5" opacity="0.6"/>`
      break
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs}</defs>${shape}${detail}
</svg>`
}

export function noteCacheKey(style: NoteStyle, paper: string, w: number, h: number, seed: string): string {
  return `nt:${style}:${paper}:${Math.round(w / 6)}:${Math.round(h / 6)}:${seed}`
}
