import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Group, Rect, Line, Image as KImage, Transformer } from 'react-konva'
import Konva from 'konva'
import { PAGE_H, PAGE_W, MIN_ELEMENT_SIZE, PAGE_THUMB_WIDTH } from '@/lib/constants'
import { useEditor } from '@/store/editor'
import { useSettings } from '@/store/settings'
import { backgroundKey, backgroundSvg } from '@/content/papers'
import { createDoodle } from '@/lib/elements'
import { haptic, prefersReducedMotion } from '@/lib/motion'
import { ensureFontsReady } from '@/content/fonts'
import { useSvgImage } from './useKonvaImage'
import { ElementContent, shadowFor } from './nodes'
import {
  collectCandidates, distanceToPolyline, halfExtents, snapPosition, toLocal, type Guide,
} from './snapping'
import type { PageElement } from '@/lib/types'

interface Props {
  width: number
  height: number
  /** Opens the text overlay for this element. */
  onEditText: (id: string) => void
  onLayerMenu: (id: string, at: { x: number; y: number }) => void
}

/**
 * The scrapbook canvas.
 *
 * Coordinate model: the page is a fixed 1080x1440 space and the Stage is scaled
 * to fit whatever room it's given. Every position that reaches the store is in
 * page units, so a page laid out on a phone opens byte-identical on a desktop.
 *
 * Layering: three Konva layers, and the split is deliberate. The paper almost
 * never changes, so it sits alone and is skipped on every element redraw. The
 * elements layer is the busy one. Overlay (transform handles, snap guides, the
 * live doodle stroke) is separate so it can be hidden wholesale when rendering
 * a thumbnail or an export.
 */
export function EditorCanvas({ width, height, onEditText, onLayerMenu }: Props) {
  const stageRef = useRef<Konva.Stage>(null)
  const elementsLayer = useRef<Konva.Layer>(null)
  const overlayLayer = useRef<Konva.Layer>(null)
  const transformer = useRef<Konva.Transformer>(null)
  const nodeRefs = useRef(new Map<string, Konva.Group>())

  const elements = useEditor((s) => s.elements)
  const background = useEditor((s) => s.background)
  const selectedId = useEditor((s) => s.selectedId)
  const tool = useEditor((s) => s.tool)
  const penColor = useEditor((s) => s.penColor)
  const penSize = useEditor((s) => s.penSize)
  const snapEnabled = useSettings((s) => s.snapEnabled)
  const showGuides = useSettings((s) => s.showSnapGuides)

  const [guides, setGuides] = useState<Guide[]>([])
  const [stroke, setStroke] = useState<number[]>([])
  const [fontsReady, setFontsReady] = useState(false)

  const scale = Math.min(width / PAGE_W, height / PAGE_H)
  const drawing = tool === 'pen' || tool === 'marker' || tool === 'highlighter'
  const erasing = tool === 'eraser'

  const ordered = useMemo(
    () => elements.slice().sort((a, b) => a.zIndex - b.zIndex),
    [elements],
  )

  /* ---------------------------------------------------------- background */

  const bgSvg = useMemo(() => backgroundSvg(background, PAGE_W, PAGE_H), [background])
  const bgImage = useSvgImage(backgroundKey(background), bgSvg)

  /* --------------------------------------------------------------- fonts */

  // Konva measures text with the canvas API, which does not wait for webfonts.
  // Drawing before they land bakes in a fallback face until something else
  // forces a redraw, so the first paint waits.
  useEffect(() => {
    let live = true
    void ensureFontsReady().then(() => {
      if (!live) return
      setFontsReady(true)
      elementsLayer.current?.batchDraw()
    })
    return () => { live = false }
  }, [])

  /* --------------------------------------------------------- transformer */

  useEffect(() => {
    const tr = transformer.current
    if (!tr) return
    const selected = selectedId ? nodeRefs.current.get(selectedId) : null
    const element = elements.find((el) => el.id === selectedId)

    if (selected && element && !element.locked && tool === 'select') {
      tr.nodes([selected])
      // Photos, stickers and notes look wrong stretched on one axis; text and
      // tape are meant to be reflowed, so they get free corners.
      const lockRatio = element.type === 'sticker' || element.type === 'photo'
      tr.keepRatio(lockRatio)
      tr.enabledAnchors(
        element.type === 'text'
          ? ['middle-left', 'middle-right']
          : lockRatio
            ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
            : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center'],
      )
    } else {
      tr.nodes([])
    }
    overlayLayer.current?.batchDraw()
  }, [selectedId, elements, tool])

  /* ------------------------------------------------------------ thumbnail */

  const registerThumbnailProvider = useEditor((s) => s.registerThumbnailProvider)

  useEffect(() => {
    const provider = async (): Promise<Blob | null> => {
      const stage = stageRef.current
      const overlay = overlayLayer.current
      if (!stage) return null
      // Handles and guides are UI, not content — they must never bake into a
      // saved thumbnail or an export.
      const wasVisible = overlay?.visible() ?? false
      overlay?.visible(false)
      try {
        // toCanvas() handles the device-pixel-ratio maths itself, so the
        // ratio here is purely "thumbnail width / on-screen width".
        const canvas = stage.toCanvas({
          pixelRatio: PAGE_THUMB_WIDTH / (PAGE_W * scale),
          x: 0,
          y: 0,
          width: PAGE_W * scale,
          height: PAGE_H * scale,
        })
        return await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.72)
        })
      } catch (error) {
        console.error('[pagebound] thumbnail failed', error)
        return null
      } finally {
        overlay?.visible(wasVisible)
        overlay?.batchDraw()
      }
    }
    registerThumbnailProvider(provider)
    return () => registerThumbnailProvider(null)
  }, [registerThumbnailProvider, scale])

  /* -------------------------------------------------------------- drawing */

  const strokeRef = useRef<number[]>([])
  const drawingRef = useRef(false)

  const pagePoint = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) return null
    return { x: pointer.x / scale, y: pointer.y / scale }
  }, [scale])

  const eraseAt = useCallback((point: { x: number; y: number }) => {
    const state = useEditor.getState()
    const radius = 26
    // Newest strokes erase first, matching what the eye expects on top.
    for (let i = state.elements.length - 1; i >= 0; i--) {
      const el = state.elements[i]
      if (el.type !== 'doodle' || el.locked) continue
      const local = toLocal(el, point.x, point.y)
      if (local.x < -radius || local.y < -radius || local.x > el.width + radius || local.y > el.height + radius) continue
      if (distanceToPolyline(el.props.points, local.x, local.y) <= radius + el.props.size / 2) {
        state.removeElement(el.id)
        haptic('tap')
        return
      }
    }
  }, [])

  const onStagePointerDown = useCallback((event: Konva.KonvaEventObject<PointerEvent>) => {
    if (drawing) {
      const point = pagePoint()
      if (!point) return
      drawingRef.current = true
      strokeRef.current = [point.x, point.y]
      setStroke(strokeRef.current)
      return
    }
    if (erasing) {
      drawingRef.current = true
      const point = pagePoint()
      if (point) eraseAt(point)
      return
    }
    // A tap on bare paper clears the selection.
    if (event.target === event.target.getStage()) {
      useEditor.getState().select(null)
    }
  }, [drawing, erasing, pagePoint, eraseAt])

  const onStagePointerMove = useCallback(() => {
    if (!drawingRef.current) return
    const point = pagePoint()
    if (!point) return

    if (erasing) { eraseAt(point); return }

    // Skip points closer than ~2 page units: raw pointer streams are far denser
    // than the curve needs, and every extra point costs on redraw and on save.
    const points = strokeRef.current
    const lastX = points[points.length - 2]
    const lastY = points[points.length - 1]
    if (Math.hypot(point.x - lastX, point.y - lastY) < 2.5) return

    strokeRef.current = [...points, point.x, point.y]
    setStroke(strokeRef.current)
  }, [erasing, pagePoint, eraseAt])

  const onStagePointerUp = useCallback(() => {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (erasing) return

    const points = strokeRef.current
    strokeRef.current = []
    setStroke([])
    if (points.length < 4) return

    const doodle = createDoodle(points, tool as 'pen' | 'marker' | 'highlighter', penColor, penSize)
    if (doodle) {
      useEditor.getState().addElement(doodle, { select: false })
      haptic('tap')
    }
  }, [erasing, tool, penColor, penSize])

  /* ----------------------------------------------------------- pop-in tween */

  const seen = useRef(new Set<string>())
  useEffect(() => {
    if (prefersReducedMotion()) {
      for (const el of elements) seen.current.add(el.id)
      return
    }
    for (const el of elements) {
      if (seen.current.has(el.id)) continue
      seen.current.add(el.id)
      const node = nodeRefs.current.get(el.id)
      if (!node) continue

      // Tape peels down along its length; everything else pops.
      if (el.type === 'tape') {
        node.scaleX(0.35)
        node.rotation(el.rotation - 7)
        node.to({ scaleX: 1, rotation: el.rotation, duration: 0.34, easing: Konva.Easings.BackEaseOut })
      } else {
        node.scaleX(0.84); node.scaleY(0.84); node.opacity(0)
        node.to({
          scaleX: 1, scaleY: 1, opacity: el.opacity,
          duration: 0.42, easing: Konva.Easings.BackEaseOut,
        })
      }
    }
  }, [elements])

  /* ------------------------------------------------------------- dragging */

  const candidates = useRef<ReturnType<typeof collectCandidates> | null>(null)

  const makeDragBound = useCallback((element: PageElement) => {
    return function dragBound(this: Konva.Node, pos: { x: number; y: number }) {
      const half = halfExtents(element.width, element.height, element.rotation)
      const result = snapPosition(
        { x: pos.x / scale, y: pos.y / scale },
        half,
        candidates.current ?? { xs: [], ys: [] },
        snapEnabled,
      )
      setGuides(showGuides ? result.guides : [])
      return { x: result.x * scale, y: result.y * scale }
    }
  }, [scale, snapEnabled, showGuides])

  /* ------------------------------------------------------- long-press menu */

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)

  const clearPress = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
    pressOrigin.current = null
  }, [])

  const startPress = useCallback((element: PageElement, event: Konva.KonvaEventObject<PointerEvent>) => {
    const { clientX, clientY } = event.evt
    pressOrigin.current = { x: clientX, y: clientY }
    pressTimer.current = setTimeout(() => {
      haptic('tap')
      onLayerMenu(element.id, { x: clientX, y: clientY })
      clearPress()
    }, 480)
  }, [onLayerMenu, clearPress])

  /* ---------------------------------------------------------------- render */

  if (scale <= 0) return null

  return (
    <Stage
      ref={stageRef}
      width={PAGE_W * scale}
      height={PAGE_H * scale}
      scaleX={scale}
      scaleY={scale}
      onPointerDown={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onPointerCancel={onStagePointerUp}
      style={{
        cursor: drawing ? 'crosshair' : erasing ? 'cell' : 'default',
        touchAction: 'none',
      }}
    >
      {/* Paper. Static, so it is never part of an element redraw. */}
      <Layer listening={false}>
        {bgImage
          ? <KImage image={bgImage} width={PAGE_W} height={PAGE_H} perfectDrawEnabled={false} />
          : <Rect width={PAGE_W} height={PAGE_H} fill={background.color} />}
      </Layer>

      {/* Content. */}
      <Layer ref={elementsLayer}>
        {ordered.map((element) => (
          <Group
            key={element.id}
            ref={(node) => {
              if (node) nodeRefs.current.set(element.id, node)
              else nodeRefs.current.delete(element.id)
            }}
            id={element.id}
            x={element.x}
            y={element.y}
            offsetX={element.width / 2}
            offsetY={element.height / 2}
            width={element.width}
            height={element.height}
            rotation={element.rotation}
            opacity={element.opacity}
            draggable={tool === 'select' && !element.locked}
            listening={tool === 'select' && !element.locked}
            dragBoundFunc={makeDragBound(element)}
            {...shadowFor(element)}
            onDragStart={() => {
              candidates.current = collectCandidates(useEditor.getState().elements, element.id)
              useEditor.getState().beginGesture()
              useEditor.getState().select(element.id)
              clearPress()
            }}
            onDragEnd={(event) => {
              const node = event.target
              useEditor.getState().updateElement(element.id, {
                x: node.x(),
                y: node.y(),
              })
              useEditor.getState().endGesture()
              setGuides([])
              candidates.current = null
              haptic('snap')
            }}
            onTransformStart={() => useEditor.getState().beginGesture()}
            onTransformEnd={(event) => {
              const node = event.target as Konva.Group
              // Bake the transform into real dimensions and reset the node's
              // scale, so hit areas, shadows and stroke widths stay honest.
              const nextWidth = Math.max(MIN_ELEMENT_SIZE, node.width() * node.scaleX())
              const nextHeight = Math.max(MIN_ELEMENT_SIZE, node.height() * node.scaleY())
              node.scaleX(1)
              node.scaleY(1)
              node.offsetX(nextWidth / 2)
              node.offsetY(nextHeight / 2)
              useEditor.getState().updateElement(element.id, {
                x: node.x(),
                y: node.y(),
                width: nextWidth,
                height: nextHeight,
                rotation: node.rotation(),
              })
              useEditor.getState().endGesture()
            }}
            onPointerDown={(event) => startPress(element, event)}
            onPointerMove={(event) => {
              if (!pressOrigin.current) return
              const dx = event.evt.clientX - pressOrigin.current.x
              const dy = event.evt.clientY - pressOrigin.current.y
              if (Math.hypot(dx, dy) > 10) clearPress()
            }}
            onPointerUp={clearPress}
            onPointerLeave={clearPress}
            onClick={() => useEditor.getState().select(element.id)}
            onTap={() => useEditor.getState().select(element.id)}
            onDblClick={() => {
              if (element.type === 'text' || element.type === 'note') onEditText(element.id)
            }}
            onDblTap={() => {
              if (element.type === 'text' || element.type === 'note') onEditText(element.id)
            }}
          >
            {/* Invisible hit rectangle: strokes and thin shapes are otherwise
                almost impossible to grab, especially with a fingertip. */}
            <Rect width={element.width} height={element.height} fill="transparent" />
            {fontsReady || (element.type !== 'text' && element.type !== 'note')
              ? <ElementContent
                  element={element}
                  onMeasure={(measured) => {
                    if (element.type === 'text') {
                      useEditor.getState().updateQuiet(element.id, { height: measured })
                    }
                  }}
                />
              : null}
          </Group>
        ))}
      </Layer>

      {/* Handles, guides and the in-progress stroke. */}
      <Layer ref={overlayLayer}>
        {guides.map((guide, i) => (
          <Line
            key={`${guide.axis}-${guide.position}-${i}`}
            points={guide.axis === 'x'
              ? [guide.position, 0, guide.position, PAGE_H]
              : [0, guide.position, PAGE_W, guide.position]}
            stroke={guide.kind === 'page' ? '#C8674A' : '#7D98B3'}
            strokeWidth={1.5 / scale}
            dash={[10 / scale, 8 / scale]}
            opacity={0.85}
            listening={false}
            perfectDrawEnabled={false}
          />
        ))}

        {stroke.length >= 4 && (
          <Line
            points={stroke}
            stroke={penColor}
            strokeWidth={penSize}
            opacity={tool === 'highlighter' ? 0.38 : tool === 'marker' ? 0.92 : 1}
            lineCap={tool === 'highlighter' ? 'butt' : 'round'}
            lineJoin="round"
            tension={0.3}
            listening={false}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
        )}

        {/* Transformer geometry is in SCREEN pixels, not page units: Konva
            normalises the handles against the stage scale itself, so dividing
            by `scale` here would compensate twice and produce handles the size
            of the page on a phone. (The guide Lines above are plain shapes in
            the scaled layer, so those genuinely do need the 1/scale.) */}
        <Transformer
          ref={transformer}
          rotateEnabled
          rotationSnaps={[-90, -45, 0, 45, 90, 135, 180, -135]}
          rotationSnapTolerance={4}
          anchorSize={14}
          anchorCornerRadius={7}
          anchorStroke="#2B2A28"
          anchorFill="#FFFDF8"
          anchorStrokeWidth={1.5}
          borderStroke="#C8674A"
          borderStrokeWidth={1.5}
          borderDash={[6, 5]}
          padding={6}
          flipEnabled={false}
          ignoreStroke
          anchorStyleFunc={(anchor) => {
            // Finger-friendly hit area, and a distinct rotation grip so it
            // isn't mistaken for a resize handle.
            anchor.hitStrokeWidth(22)
            if (anchor.hasName('rotater')) {
              anchor.fill('#C8674A')
              anchor.stroke('#FFFDF8')
            }
          }}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < MIN_ELEMENT_SIZE * scale || newBox.height < MIN_ELEMENT_SIZE * scale
              ? oldBox
              : newBox}
        />
      </Layer>
    </Stage>
  )
}
