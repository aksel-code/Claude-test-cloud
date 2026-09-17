import type { CoverStyle } from '@/lib/types'
import { shade, readableInk } from './papers'

/**
 * Journal covers are DOM elements, not canvas, so they're built from layered
 * CSS gradients plus a texture overlay. Cheaper than images, recolourable, and
 * they scale from a 90px recent-strip tile to a full-bleed hero without assets.
 */

export interface CoverSpec {
  id: CoverStyle
  name: string
  blurb: string
  /** Suggested accent colours for this material. */
  palette: string[]
}

export const COVERS: CoverSpec[] = [
  { id: 'fabric',  name: 'Fabric',  blurb: 'Woven, matte', palette: ['#C8674A', '#8FA58A', '#7D98B3', '#D9A441', '#8E6E9E'] },
  { id: 'kraft',   name: 'Kraft',   blurb: 'Recycled card', palette: ['#B58D5F', '#A47B56', '#C9A882', '#8A6C4C'] },
  { id: 'leather', name: 'Leather', blurb: 'Grained, deep', palette: ['#6B3F2E', '#2F3A42', '#43533F', '#5A3A4A', '#2B2A28'] },
  { id: 'pastel',  name: 'Pastel',  blurb: 'Soft and chalky', palette: ['#F3D9C4', '#D9E2D6', '#CFDDE8', '#E9D8E6', '#FDF3B8'] },
  { id: 'linen',   name: 'Linen',   blurb: 'Loose weave', palette: ['#E8DFCD', '#D9CFBE', '#CBD6CC', '#D3DAE2'] },
  { id: 'marble',  name: 'Marble',  blurb: 'Composition book', palette: ['#2B2A28', '#3E4A57', '#4A3F3A'] },
  { id: 'photo',   name: 'Your photo', blurb: 'Use an image', palette: ['#C8674A', '#8FA58A', '#7D98B3'] },
]

const byId = new Map(COVERS.map((c) => [c.id, c]))
export function coverSpec(id: CoverStyle): CoverSpec {
  return byId.get(id) ?? COVERS[0]
}

const WEAVE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cpath d='M0 0h3v3H0zM3 3h3v3H3z' fill='%23000' opacity='.055'/%3E%3C/svg%3E")`
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='.35'/%3E%3C/svg%3E")`
const FIBRE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04 0.7' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)' opacity='.4'/%3E%3C/svg%3E")`

/** Background shorthand for a cover face. */
export function coverBackground(style: CoverStyle, color: string): string {
  const dark = shade(color, 0.22)
  const darker = shade(color, 0.42)
  switch (style) {
    case 'fabric':
      return `${WEAVE}, linear-gradient(150deg, ${shade(color, -0.04)}, ${color} 45%, ${dark})`
    case 'kraft':
      return `${FIBRE}, linear-gradient(135deg, ${shade(color, 0.06)}, ${color} 40%, ${dark})`
    case 'leather':
      return `${GRAIN}, radial-gradient(120% 100% at 30% 10%, ${shade(color, -0.10)}, ${color} 55%, ${darker})`
    case 'pastel':
      return `linear-gradient(160deg, #ffffff55, transparent 40%), linear-gradient(150deg, ${color}, ${dark})`
    case 'linen':
      return `${WEAVE}, ${FIBRE}, linear-gradient(140deg, ${shade(color, -0.03)}, ${color} 50%, ${dark})`
    case 'marble':
      // Composition-book speckle: two offset dot fields over a dark ground.
      return `radial-gradient(#ffffffcc 0.9px, transparent 1px) 0 0/7px 7px,
              radial-gradient(#ffffff66 0.8px, transparent 1px) 3px 4px/9px 9px,
              linear-gradient(150deg, ${shade(color, -0.12)}, ${color} 50%, ${darker})`
    case 'photo':
    default:
      return `linear-gradient(150deg, ${color}, ${dark})`
  }
}

/** The darker vertical band down the binding edge. */
export function spineBackground(style: CoverStyle, color: string): string {
  const deep = shade(color, style === 'pastel' ? 0.18 : 0.34)
  return `linear-gradient(90deg, ${shade(color, 0.48)} 0%, ${deep} 22%, ${shade(color, 0.16)} 60%, ${deep} 100%)`
}

/** Title colour that stays legible on the chosen cover. */
export function coverInk(style: CoverStyle, color: string): string {
  if (style === 'photo') return '#FBF7EF'
  if (style === 'marble' || style === 'leather') return '#FBF7EF'
  return readableInk(color)
}

export const DEFAULT_COVER_COLOR = '#C8674A'
