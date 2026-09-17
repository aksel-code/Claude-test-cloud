import { useEffect, useMemo, useRef } from 'react'
import { Group, Image as KImage, Line, Rect, Text, Circle, Star, Arrow, Path } from 'react-konva'
import type Konva from 'konva'
import { useAssetImage, useSvgImage } from './useKonvaImage'
import { getFont } from '@/content/fonts'
import { findSticker, stickerCacheKey, stickerSvg } from '@/content/stickers'
import { tapeCacheKey, tapeSpec, tapeSvg } from '@/content/tapes'
import { noteCacheKey, noteSpec, noteSvg } from '@/content/notes'
import { seededRandom } from '@/lib/id'
import type {
  DoodleElement, NoteElement, PageElement, PhotoElement, ShapeElement,
  StickerElement, TapeElement, TextElement,
} from '@/lib/types'

/**
 * Konva renderers, one per element type.
 *
 * Shared conventions:
 * - Every element is a Group whose (x, y) is the element *centre*, with
 *   offsetX/offsetY at half its size, so rotation pivots about the middle.
 *   Children then draw in a plain 0..w / 0..h box.
 * - `perfectDrawEnabled={false}` skips Konva's off-screen buffer pass. It only
 *   matters for overlapping strokes with transparency, which nothing here has,
 *   and it is a large win with 50+ nodes on a page.
 * - Nothing inside a group listens for events; the Group itself is the hit
 *   target. Fewer hit-test shapes means smoother dragging.
 */

export interface NodeProps<T extends PageElement = PageElement> {
  element: T
  /** Reports measured height back for auto-growing text. */
  onMeasure?: (height: number) => void
}

/* --------------------------------------------------------------- shadows */

/**
 * Elements cast a soft, warm shadow so they read as *on* the paper. Bigger
 * elements sit slightly higher off the page, like a thicker piece of card.
 */
function paperShadow(el: PageElement, strength = 1) {
  const lift = Math.min(1, Math.max(el.width, el.height) / 600)
  return {
    shadowColor: '#2B2A28',
    shadowBlur: (6 + lift * 16) * strength,
    shadowOpacity: 0.20 * strength,
    shadowOffsetX: 0,
    shadowOffsetY: (1.5 + lift * 5) * strength,
  }
}

/* ------------------------------------------------------------------ text */

export function TextNode({ element, onMeasure }: NodeProps<TextElement>) {
  const ref = useRef<Konva.Text>(null)
  const font = getFont(element.props.font)
  const size = element.props.fontSize * font.scale

  // Text grows downward as it wraps: the author sets the column width, the
  // block finds its own height.
  useEffect(() => {
    const node = ref.current
    if (!node || !onMeasure) return
    const measured = node.height()
    if (Math.abs(measured - element.height) > 1.5) onMeasure(measured)
  })

  return (
    <Text
      ref={ref}
      text={element.props.text || ' '}
      width={element.width}
      fontSize={size}
      fontFamily={font.stack}
      fontStyle={String(font.weight)}
      fill={element.props.color}
      align={element.props.align}
      lineHeight={element.props.lineHeight}
      letterSpacing={element.props.letterSpacing}
      y={size * font.baselineNudge}
      wrap="word"
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}

/* ----------------------------------------------------------------- photo */

const FRAME_BORDER = { polaroid: 0.055, torn: 0.03, rounded: 0, filmstrip: 0, none: 0 }

export function PhotoNode({ element }: NodeProps<PhotoElement>) {
  const image = useAssetImage(element.props.assetId)
  const { frame } = element.props
  const w = element.width
  const h = element.height

  // Polaroids have a fat bottom lip; everything else is even all round.
  const pad = FRAME_BORDER[frame] * Math.min(w, h)
  const bottomPad = frame === 'polaroid' ? pad * 3.6 : pad
  const innerW = w - pad * 2
  const innerH = h - pad - bottomPad

  const torn = useMemo(() => tornPath(element.id, w, h), [element.id, w, h])

  if (frame === 'filmstrip') {
    const bar = h * 0.11
    return (
      <>
        <Rect width={w} height={h} fill="#1A1815" cornerRadius={2} perfectDrawEnabled={false} />
        {image && (
          <KImage
            image={image}
            x={0}
            y={bar}
            width={w}
            height={h - bar * 2}
            perfectDrawEnabled={false}
          />
        )}
        {/* Sprocket holes, top and bottom. */}
        {Array.from({ length: Math.max(3, Math.round(w / (bar * 1.55))) }, (_, i) => {
          const holeW = bar * 0.52
          const gap = (w - holeW) / Math.max(1, Math.round(w / (bar * 1.55)) - 1)
          return (
            <Group key={i}>
              <Rect x={i * gap} y={bar * 0.24} width={holeW} height={bar * 0.5}
                fill="#FBF7EF" cornerRadius={holeW * 0.22} perfectDrawEnabled={false} />
              <Rect x={i * gap} y={h - bar * 0.74} width={holeW} height={bar * 0.5}
                fill="#FBF7EF" cornerRadius={holeW * 0.22} perfectDrawEnabled={false} />
            </Group>
          )
        })}
      </>
    )
  }

  if (frame === 'torn') {
    return (
      <>
        <Path data={torn} fill="#FFFDF8" perfectDrawEnabled={false} />
        <Group clipFunc={(ctx) => clipTorn(ctx, element.id, w, h, pad)}>
          {image && (
            <KImage image={image} x={pad} y={pad} width={innerW} height={h - pad * 2} perfectDrawEnabled={false} />
          )}
        </Group>
      </>
    )
  }

  const radius = frame === 'rounded' ? Math.min(w, h) * 0.055 : 0

  return (
    <>
      {frame === 'polaroid' && (
        <Rect width={w} height={h} fill="#FFFDF8" cornerRadius={3} perfectDrawEnabled={false} />
      )}
      <Group
        clipX={pad}
        clipY={pad}
        clipWidth={innerW}
        clipHeight={innerH}
        clipFunc={radius ? (ctx) => roundRect(ctx, 0, 0, w, h, radius) : undefined}
      >
        {image ? (
          <KImage
            image={image}
            x={pad}
            y={pad}
            width={innerW}
            height={innerH}
            perfectDrawEnabled={false}
          />
        ) : (
          <Rect x={pad} y={pad} width={innerW} height={innerH} fill="#E8DFCD" perfectDrawEnabled={false} />
        )}
      </Group>

      {/* A warm wash, as if the print has aged a little. */}
      {element.props.warmth > 0 && (
        <Rect
          x={pad} y={pad} width={innerW} height={innerH}
          fill="#D9A441"
          opacity={element.props.warmth * 0.3}
          cornerRadius={radius}
          globalCompositeOperation="multiply"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {frame === 'polaroid' && element.props.caption && (
        <Text
          text={element.props.caption}
          x={pad}
          y={h - bottomPad + bottomPad * 0.16}
          width={innerW}
          height={bottomPad * 0.7}
          align="center"
          verticalAlign="middle"
          fontSize={Math.min(bottomPad * 0.42, 30)}
          fontFamily={getFont('caveat').stack}
          fill="#5A544C"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </>
  )
}

/** A wobbly, hand-torn rectangle. Seeded so a given photo always tears the same. */
function tornPath(seed: string, w: number, h: number): string {
  const steps = 14
  const amp = Math.min(w, h) * 0.022
  const pts: string[] = [`M0 0`]
  for (let i = 1; i <= steps; i++) pts.push(`L${((w * i) / steps).toFixed(1)} ${(seededRandom(seed, i) * amp).toFixed(1)}`)
  for (let i = 1; i <= steps; i++) pts.push(`L${(w - seededRandom(seed, 30 + i) * amp).toFixed(1)} ${((h * i) / steps).toFixed(1)}`)
  for (let i = steps; i >= 0; i--) pts.push(`L${((w * i) / steps).toFixed(1)} ${(h - seededRandom(seed, 60 + i) * amp).toFixed(1)}`)
  for (let i = steps; i >= 0; i--) pts.push(`L${(seededRandom(seed, 90 + i) * amp).toFixed(1)} ${((h * i) / steps).toFixed(1)}`)
  return `${pts.join(' ')} Z`
}

function clipTorn(ctx: Konva.Context | CanvasRenderingContext2D, seed: string, w: number, h: number, pad: number) {
  const steps = 14
  const amp = Math.min(w, h) * 0.02
  const c = ctx as CanvasRenderingContext2D
  c.beginPath()
  c.moveTo(pad, pad)
  for (let i = 1; i <= steps; i++) c.lineTo(pad + ((w - pad * 2) * i) / steps, pad + seededRandom(seed, i) * amp)
  for (let i = 1; i <= steps; i++) c.lineTo(w - pad - seededRandom(seed, 30 + i) * amp, pad + ((h - pad * 2) * i) / steps)
  for (let i = steps; i >= 0; i--) c.lineTo(pad + ((w - pad * 2) * i) / steps, h - pad - seededRandom(seed, 60 + i) * amp)
  for (let i = steps; i >= 0; i--) c.lineTo(pad + seededRandom(seed, 90 + i) * amp, pad + ((h - pad * 2) * i) / steps)
  c.closePath()
}

function roundRect(ctx: Konva.Context | CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const c = ctx as CanvasRenderingContext2D
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/* --------------------------------------------------------------- sticker */

export function StickerNode({ element }: NodeProps<StickerElement>) {
  const { packId, stickerId, tint } = element.props
  const sticker = findSticker(packId, stickerId)
  // A sticker can go missing if a pack is unregistered (or a page references a
  // pack that was never installed). Draw a placeholder rather than handing an
  // empty SVG to the image loader.
  const key = sticker ? stickerCacheKey(packId, stickerId, tint) : 'missing'
  const svg = useMemo(
    () => (sticker ? stickerSvg(sticker, tint) : MISSING_STICKER),
    [sticker, tint],
  )
  const image = useSvgImage(key, svg)

  if (!image) return null
  return (
    <KImage
      image={image}
      width={element.width}
      height={element.height}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}

const MISSING_STICKER = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect x="6" y="6" width="88" height="88" rx="10" fill="none" stroke="#B9AE9B" stroke-width="3" stroke-dasharray="7 6"/>
  <path d="M34 42h32M34 58h20" stroke="#B9AE9B" stroke-width="5" stroke-linecap="round"/>
</svg>`

/* ------------------------------------------------------------------ tape */

export function TapeNode({ element }: NodeProps<TapeElement>) {
  const spec = tapeSpec(element.props.patternId)
  const { width: w, height: h } = element
  const key = tapeCacheKey(element.props.patternId, element.props.color, w, h, element.id)
  const svg = useMemo(
    () => tapeSvg(spec, element.props.color, w, h, element.id),
    [spec, element.props.color, w, h, element.id],
  )
  const image = useSvgImage(key, svg)

  if (!image) return null
  return (
    <KImage
      image={image}
      width={w}
      height={h}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}

/* ------------------------------------------------------------------ note */

export function NoteNode({ element }: NodeProps<NoteElement>) {
  const spec = noteSpec(element.props.style)
  const { width: w, height: h } = element
  const key = noteCacheKey(element.props.style, element.props.paper, w, h, element.id)
  const svg = useMemo(
    () => noteSvg(element.props.style, element.props.paper, w, h, element.id),
    [element.props.style, element.props.paper, w, h, element.id],
  )
  const image = useSvgImage(key, svg)
  const font = getFont(element.props.font)
  const [px, pt, pr, pb] = spec.padding

  return (
    <>
      {image && <KImage image={image} width={w} height={h} listening={false} perfectDrawEnabled={false} />}
      <Text
        text={element.props.text}
        x={w * px}
        y={h * pt}
        width={w * (1 - px - pr)}
        height={h * (1 - pt - pb)}
        fontSize={element.props.fontSize * font.scale}
        fontFamily={font.stack}
        fill={element.props.color}
        lineHeight={1.34}
        wrap="word"
        ellipsis
        listening={false}
        perfectDrawEnabled={false}
      />
    </>
  )
}

/* ---------------------------------------------------------------- doodle */

const TOOL_STYLE = {
  pen: { opacity: 1, cap: 'round' as const, composite: undefined },
  marker: { opacity: 0.92, cap: 'round' as const, composite: undefined },
  // A highlighter is translucent ink that darkens what it crosses.
  highlighter: { opacity: 0.38, cap: 'butt' as const, composite: 'multiply' as const },
}

export function DoodleNode({ element }: NodeProps<DoodleElement>) {
  const { points, color, size, tool } = element.props
  const style = TOOL_STYLE[tool]

  // Points are stored in the stroke's original bounding box; if the element has
  // been resized since, scale them to match rather than re-baking the geometry.
  const scaled = useMemo(() => {
    const original = boundsOf(points)
    const sx = original.w ? element.width / original.w : 1
    const sy = original.h ? element.height / original.h : 1
    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return points
    const out = new Array<number>(points.length)
    for (let i = 0; i < points.length; i += 2) {
      out[i] = points[i] * sx
      out[i + 1] = points[i + 1] * sy
    }
    return out
  }, [points, element.width, element.height])

  return (
    <Line
      points={scaled}
      stroke={color}
      strokeWidth={size}
      opacity={style.opacity}
      lineCap={style.cap}
      lineJoin="round"
      tension={tool === 'pen' ? 0.34 : 0.2}
      globalCompositeOperation={style.composite}
      listening={false}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
    />
  )
}

function boundsOf(points: number[]) {
  let maxX = 0, maxY = 0
  for (let i = 0; i < points.length; i += 2) {
    maxX = Math.max(maxX, points[i])
    maxY = Math.max(maxY, points[i + 1])
  }
  return { w: maxX, h: maxY }
}

/* ----------------------------------------------------------------- shape */

export function ShapeNode({ element }: NodeProps<ShapeElement>) {
  const { shape, color, strokeWidth } = element.props
  const w = element.width
  const h = element.height
  const common = {
    stroke: color,
    strokeWidth,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    listening: false,
    perfectDrawEnabled: false,
    shadowForStrokeEnabled: false,
  }

  switch (shape) {
    case 'line':
      // Drawn as a shallow arc, because nobody rules a straight line freehand.
      return <Line {...common} points={[0, h / 2, w * 0.5, h / 2 - h * 0.18, w, h / 2]} tension={0.5} />

    case 'underline':
      return (
        <>
          <Line {...common} points={[0, h * 0.45, w * 0.5, h * 0.3, w, h * 0.5]} tension={0.5} />
          <Line {...common} strokeWidth={strokeWidth * 0.6} opacity={0.55}
            points={[w * 0.06, h * 0.72, w * 0.5, h * 0.6, w * 0.94, h * 0.76]} tension={0.5} />
        </>
      )

    case 'divider':
      return (
        <>
          <Line {...common} points={[0, h / 2, w * 0.38, h / 2]} tension={0.4} />
          <Star {...common} numPoints={4} innerRadius={h * 0.1} outerRadius={h * 0.32}
            x={w / 2} y={h / 2} fill={color} strokeWidth={0} />
          <Line {...common} points={[w * 0.62, h / 2, w, h / 2]} tension={0.4} />
        </>
      )

    case 'arrow':
      return (
        <Arrow
          {...common}
          points={[0, h * 0.85, w * 0.45, h * 0.1, w, h * 0.4]}
          tension={0.4}
          pointerLength={strokeWidth * 3}
          pointerWidth={strokeWidth * 2.6}
          fill={color}
        />
      )

    case 'circle':
      return (
        <Circle
          {...common}
          x={w / 2}
          y={h / 2}
          radius={Math.min(w, h) / 2 - strokeWidth}
          scaleX={w / Math.min(w, h)}
          scaleY={h / Math.min(w, h)}
        />
      )

    case 'star':
    default:
      return (
        <Star
          {...common}
          x={w / 2}
          y={h / 2}
          numPoints={5}
          innerRadius={Math.min(w, h) * 0.2}
          outerRadius={Math.min(w, h) * 0.46}
          fill={color}
          strokeWidth={0}
        />
      )
  }
}

/* -------------------------------------------------------------- dispatch */

export function ElementContent({ element, onMeasure }: NodeProps) {
  switch (element.type) {
    case 'text': return <TextNode element={element} onMeasure={onMeasure} />
    case 'photo': return <PhotoNode element={element} />
    case 'sticker': return <StickerNode element={element} />
    case 'tape': return <TapeNode element={element} />
    case 'note': return <NoteNode element={element} />
    case 'doodle': return <DoodleNode element={element} />
    case 'shape': return <ShapeNode element={element} />
  }
}

/** Shadow config per type: tape lies flat, paper lifts. */
export function shadowFor(element: PageElement) {
  switch (element.type) {
    case 'tape':
      return { shadowColor: '#2B2A28', shadowBlur: 5, shadowOpacity: 0.16, shadowOffsetY: 1.5 }
    case 'doodle':
    case 'shape':
      return { shadowOpacity: 0 } // Ink soaks in; it doesn't sit on top.
    case 'sticker':
      return paperShadow(element, 0.8)
    default:
      return paperShadow(element)
  }
}
