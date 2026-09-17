import { PAGE_H, PAGE_W, SNAP_THRESHOLD } from '@/lib/constants'
import { elementBounds } from '@/lib/elements'
import type { PageElement } from '@/lib/types'

export interface Guide {
  axis: 'x' | 'y'
  position: number
  /** Page guides draw full-length; element guides only span the pair involved. */
  kind: 'page' | 'element'
}

interface Candidate {
  position: number
  kind: Guide['kind']
}

/**
 * Alignment snapping.
 *
 * Candidates come from the page itself (centre lines and a comfortable margin)
 * and from the edges and centres of every other unlocked element. A dragged
 * element snaps when any of its own three reference points — left/centre/right
 * and top/middle/bottom — comes within SNAP_THRESHOLD of a candidate.
 *
 * The threshold is in page units and the drag position arrives in page units
 * too, so snapping feels identical on a phone and a 27" monitor instead of
 * getting stickier as the canvas gets bigger.
 */
export function collectCandidates(elements: PageElement[], excludeId: string) {
  const margin = 72
  const xs: Candidate[] = [
    { position: PAGE_W / 2, kind: 'page' },
    { position: margin, kind: 'page' },
    { position: PAGE_W - margin, kind: 'page' },
  ]
  const ys: Candidate[] = [
    { position: PAGE_H / 2, kind: 'page' },
    { position: margin, kind: 'page' },
    { position: PAGE_H - margin, kind: 'page' },
  ]

  for (const el of elements) {
    if (el.id === excludeId) continue
    const b = elementBounds(el)
    xs.push({ position: b.left, kind: 'element' }, { position: el.x, kind: 'element' }, { position: b.right, kind: 'element' })
    ys.push({ position: b.top, kind: 'element' }, { position: el.y, kind: 'element' }, { position: b.bottom, kind: 'element' })
  }

  return { xs, ys }
}

export interface SnapResult {
  x: number
  y: number
  guides: Guide[]
}

/**
 * @param centre  proposed centre of the dragged element, in page units
 * @param half    half-width / half-height of its axis-aligned bounds
 */
export function snapPosition(
  centre: { x: number; y: number },
  half: { x: number; y: number },
  candidates: ReturnType<typeof collectCandidates>,
  enabled: boolean,
): SnapResult {
  if (!enabled) return { x: centre.x, y: centre.y, guides: [] }

  const guides: Guide[] = []
  let { x, y } = centre

  // Offsets of the element's own reference points from its centre.
  const refs: [number, 'edge' | 'centre'][] = [[-half.x, 'edge'], [0, 'centre'], [half.x, 'edge']]
  let bestX: { delta: number; guide: Guide } | null = null
  for (const [offset] of refs) {
    for (const candidate of candidates.xs) {
      const delta = candidate.position - (centre.x + offset)
      if (Math.abs(delta) <= SNAP_THRESHOLD && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
        bestX = { delta, guide: { axis: 'x', position: candidate.position, kind: candidate.kind } }
      }
    }
  }
  if (bestX) { x += bestX.delta; guides.push(bestX.guide) }

  const refsY: [number, 'edge' | 'centre'][] = [[-half.y, 'edge'], [0, 'centre'], [half.y, 'edge']]
  let bestY: { delta: number; guide: Guide } | null = null
  for (const [offset] of refsY) {
    for (const candidate of candidates.ys) {
      const delta = candidate.position - (centre.y + offset)
      if (Math.abs(delta) <= SNAP_THRESHOLD && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) {
        bestY = { delta, guide: { axis: 'y', position: candidate.position, kind: candidate.kind } }
      }
    }
  }
  if (bestY) { y += bestY.delta; guides.push(bestY.guide) }

  return { x, y, guides }
}

/** Half-extents of an element's axis-aligned bounds at a given rotation. */
export function halfExtents(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    x: (width * cos + height * sin) / 2,
    y: (width * sin + height * cos) / 2,
  }
}

/**
 * Shortest distance from a point to a polyline, used by the eraser. Returns
 * Infinity for a degenerate stroke so it can never be the nearest hit.
 */
export function distanceToPolyline(points: number[], px: number, py: number): number {
  if (points.length < 4) return Infinity
  let best = Infinity
  for (let i = 0; i < points.length - 2; i += 2) {
    best = Math.min(best, distanceToSegment(px, py, points[i], points[i + 1], points[i + 2], points[i + 3]))
  }
  return best
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/** Rotates a page-space point into an element's local (unrotated) frame. */
export function toLocal(el: PageElement, px: number, py: number): { x: number; y: number } {
  const rad = (-el.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = px - el.x
  const dy = py - el.y
  return {
    x: dx * cos - dy * sin + el.width / 2,
    y: dx * sin + dy * cos + el.height / 2,
  }
}
