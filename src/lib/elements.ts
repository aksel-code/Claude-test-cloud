import { uid, seededSpread } from './id'
import { HANDMADE_TILT, PAGE_W, PAGE_H, MIN_ELEMENT_SIZE } from './constants'
import { DEFAULT_FONT } from '@/content/fonts'
import { findSticker } from '@/content/stickers'
import { noteSpec } from '@/content/notes'
import { tapeSpec } from '@/content/tapes'
import type {
  DoodleElement, DoodleTool, NoteElement, NoteStyle, PageElement, PhotoElement,
  PhotoFrame, ShapeElement, ShapeKind, StickerElement, TapeElement, TextElement,
} from './types'

/**
 * Element factories.
 *
 * Two rules hold for everything created here:
 *
 * 1. New elements get a small rotation, so nothing lands perfectly square. The
 *    angle is derived from the element's own id rather than Math.random, so a
 *    page renders identically every time instead of twitching on each mount.
 * 2. Sizes are expressed in page units (PAGE_W x PAGE_H), never pixels, so a
 *    page composed on a phone is byte-identical to one composed on a desktop.
 */

export interface PlaceOptions {
  x?: number
  y?: number
  zIndex?: number
  /** Set false for elements that should land square (e.g. a full-bleed background). */
  tilt?: boolean
}

function base(id: string, w: number, h: number, opts: PlaceOptions) {
  return {
    id,
    x: opts.x ?? PAGE_W / 2,
    y: opts.y ?? PAGE_H / 2,
    width: w,
    height: h,
    rotation: opts.tilt === false ? 0 : seededSpread(id, HANDMADE_TILT),
    zIndex: opts.zIndex ?? 0,
    locked: false,
    opacity: 1,
  }
}

export function createText(text = '', opts: PlaceOptions & Partial<TextElement['props']> = {}): TextElement {
  const id = uid('e_')
  const { x, y, zIndex, tilt, ...props } = opts
  return {
    ...base(id, 520, 160, { x, y, zIndex, tilt }),
    type: 'text',
    props: {
      text,
      font: DEFAULT_FONT,
      fontSize: 44,
      color: '#2B2A28',
      align: 'left',
      lineHeight: 1.32,
      letterSpacing: 0,
      ...props,
    },
  }
}

export function createPhoto(
  assetId: string,
  ratio: number,
  opts: PlaceOptions & { frame?: PhotoFrame; alt?: string } = {},
): PhotoElement {
  const id = uid('e_')
  const frame = opts.frame ?? 'polaroid'
  // Fit the photo into a comfortable box rather than letting a panorama run
  // off the page. Portrait and landscape both end up roughly the same area.
  const target = 460
  const w = ratio >= 1 ? target : target * ratio
  const h = ratio >= 1 ? target / ratio : target
  return {
    ...base(id, w, h, opts),
    type: 'photo',
    props: {
      assetId,
      frame,
      alt: opts.alt ?? '',
      caption: '',
      warmth: 0,
    },
  }
}

export function createSticker(packId: string, stickerId: string, opts: PlaceOptions & { size?: number; tint?: string } = {}): StickerElement {
  const id = uid('e_')
  const sticker = findSticker(packId, stickerId)
  const size = opts.size ?? 220
  const ratio = sticker?.ratio ?? 1
  return {
    ...base(id, size * ratio, size, opts),
    type: 'sticker',
    props: { packId, stickerId, tint: opts.tint },
  }
}

export function createTape(patternId: string, opts: PlaceOptions & { color?: string; width?: number } = {}): TapeElement {
  const id = uid('e_')
  const spec = tapeSpec(patternId)
  const w = opts.width ?? 340
  return {
    // Tape goes down at a steeper angle than everything else — nobody sticks
    // tape on straight.
    ...base(id, w, 74, opts),
    rotation: opts.tilt === false ? 0 : seededSpread(id, 14),
    type: 'tape',
    props: { patternId, color: opts.color ?? spec.color },
  }
}

export function createNote(style: NoteStyle, opts: PlaceOptions & { text?: string } = {}): NoteElement {
  const id = uid('e_')
  const spec = noteSpec(style)
  return {
    ...base(id, spec.size[0], spec.size[1], opts),
    type: 'note',
    props: {
      style,
      text: opts.text ?? '',
      font: spec.defaultFont,
      fontSize: 34,
      color: spec.defaultInk,
      paper: spec.defaultPaper,
    },
  }
}

export function createShape(shape: ShapeKind, opts: PlaceOptions & { color?: string; strokeWidth?: number } = {}): ShapeElement {
  const id = uid('e_')
  const dims: Record<ShapeKind, [number, number]> = {
    line: [420, 10],
    divider: [520, 40],
    underline: [400, 40],
    arrow: [340, 120],
    circle: [300, 300],
    star: [240, 240],
  }
  const [w, h] = dims[shape]
  return {
    ...base(id, w, h, opts),
    type: 'shape',
    props: {
      shape,
      color: opts.color ?? '#2B2A28',
      strokeWidth: opts.strokeWidth ?? 7,
    },
  }
}

/**
 * Doodles arrive as absolute page coordinates from the drawing layer and are
 * rebased to element-local space here, so the stroke can be moved and rotated
 * like anything else afterwards.
 */
export function createDoodle(
  absolutePoints: number[],
  tool: DoodleTool,
  color: string,
  size: number,
): DoodleElement | null {
  if (absolutePoints.length < 4) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < absolutePoints.length; i += 2) {
    minX = Math.min(minX, absolutePoints[i])
    maxX = Math.max(maxX, absolutePoints[i])
    minY = Math.min(minY, absolutePoints[i + 1])
    maxY = Math.max(maxY, absolutePoints[i + 1])
  }

  // Pad by the stroke radius so the bounding box contains the drawn line, not
  // just its centreline — otherwise thick strokes get clipped on resize.
  const pad = size
  minX -= pad; minY -= pad; maxX += pad; maxY += pad

  const w = Math.max(MIN_ELEMENT_SIZE, maxX - minX)
  const h = Math.max(MIN_ELEMENT_SIZE, maxY - minY)
  const local: number[] = []
  for (let i = 0; i < absolutePoints.length; i += 2) {
    local.push(absolutePoints[i] - minX, absolutePoints[i + 1] - minY)
  }

  const id = uid('e_')
  return {
    id,
    type: 'doodle',
    x: minX + w / 2,
    y: minY + h / 2,
    width: w,
    height: h,
    rotation: 0, // A hand-drawn line is already imperfect; tilting it is noise.
    zIndex: 0,
    locked: false,
    opacity: 1,
    props: { tool, color, size, points: local },
  }
}

/** Deep-ish clone with a fresh id, nudged down-right like a real duplicate. */
export function duplicateElement(element: PageElement): PageElement {
  const id = uid('e_')
  return {
    ...element,
    id,
    x: element.x + 34,
    y: element.y + 34,
    rotation: element.rotation + seededSpread(id, 2),
    locked: false,
    props: structuredClone(element.props),
  } as PageElement
}

/** Human-readable name for the layer menu and the screen-reader element list. */
export function describeElement(element: PageElement): string {
  switch (element.type) {
    case 'text':
      return element.props.text.trim().slice(0, 40) || 'Empty text'
    case 'photo':
      return element.props.alt.trim() || element.props.caption.trim() || 'Photo'
    case 'sticker':
      return findSticker(element.props.packId, element.props.stickerId)?.name ?? 'Sticker'
    case 'tape':
      return `${tapeSpec(element.props.patternId).name} tape`
    case 'note':
      return element.props.text.trim().slice(0, 40) || `${noteSpec(element.props.style).name}`
    case 'doodle':
      return `${element.props.tool} drawing`
    case 'shape':
      return element.props.shape
  }
}

/** Axis-aligned bounds of a rotated element, in page units. */
export function elementBounds(el: PageElement): { left: number; top: number; right: number; bottom: number } {
  const rad = (el.rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const w = el.width * cos + el.height * sin
  const h = el.width * sin + el.height * cos
  return {
    left: el.x - w / 2,
    top: el.y - h / 2,
    right: el.x + w / 2,
    bottom: el.y + h / 2,
  }
}
