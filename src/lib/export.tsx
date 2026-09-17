import { createRoot } from 'react-dom/client'
import { Stage, Layer, Group, Rect, Image as KImage } from 'react-konva'
import { PAGE_H, PAGE_W } from './constants'
import { backgroundKey, backgroundSvg } from '@/content/papers'
import { findSticker, stickerCacheKey, stickerSvg } from '@/content/stickers'
import { tapeCacheKey, tapeSpec, tapeSvg } from '@/content/tapes'
import { noteCacheKey, noteSvg } from '@/content/notes'
import { ensureFontsReady } from '@/content/fonts'
import { loadAssetImage, loadSvgImage, peekSvgImage } from './image'
import { ElementContent, shadowFor } from '@/components/editor/nodes'
import type { Journal, Page } from './types'

/**
 * Page export.
 *
 * Rather than reimplementing every element type as imperative Konva (and then
 * watching the two renderers drift apart), export mounts the *same* React
 * components into a detached Stage and captures that. The only thing that
 * makes this reliable is preloading: every photo, sticker, tape and note SVG
 * is decoded before the first render, so what gets captured is never a
 * half-loaded page.
 */

/** Decodes everything a page draws with. Resolves when the page can render whole. */
async function preloadPage(page: Page): Promise<void> {
  const jobs: Promise<unknown>[] = [ensureFontsReady()]

  jobs.push(loadSvgImage(backgroundKey(page.background), backgroundSvg(page.background, PAGE_W, PAGE_H)))

  for (const el of page.elements) {
    switch (el.type) {
      case 'photo':
        jobs.push(loadAssetImage(el.props.assetId, 'full'))
        break
      case 'sticker': {
        const sticker = findSticker(el.props.packId, el.props.stickerId)
        if (sticker) {
          jobs.push(loadSvgImage(
            stickerCacheKey(el.props.packId, el.props.stickerId, el.props.tint),
            stickerSvg(sticker, el.props.tint),
          ))
        }
        break
      }
      case 'tape': {
        const spec = tapeSpec(el.props.patternId)
        jobs.push(loadSvgImage(
          tapeCacheKey(el.props.patternId, el.props.color, el.width, el.height, el.id),
          tapeSvg(spec, el.props.color, el.width, el.height, el.id),
        ))
        break
      }
      case 'note':
        jobs.push(loadSvgImage(
          noteCacheKey(el.props.style, el.props.paper, el.width, el.height, el.id),
          noteSvg(el.props.style, el.props.paper, el.width, el.height, el.id),
        ))
        break
      default:
        break
    }
  }

  // allSettled: one unrenderable element must not abort the whole export.
  await Promise.allSettled(jobs)
}

function OffscreenPage({ page, scale }: { page: Page; scale: number }) {
  const bg = peekSvgImage(backgroundKey(page.background))
  const ordered = page.elements.slice().sort((a, b) => a.zIndex - b.zIndex)

  return (
    <Stage width={PAGE_W * scale} height={PAGE_H * scale} scaleX={scale} scaleY={scale} listening={false}>
      <Layer listening={false}>
        {bg
          ? <KImage image={bg} width={PAGE_W} height={PAGE_H} />
          : <Rect width={PAGE_W} height={PAGE_H} fill={page.background.color} />}
      </Layer>
      <Layer listening={false}>
        {ordered.map((element) => (
          <Group
            key={element.id}
            x={element.x}
            y={element.y}
            offsetX={element.width / 2}
            offsetY={element.height / 2}
            width={element.width}
            height={element.height}
            rotation={element.rotation}
            opacity={element.opacity}
            listening={false}
            {...shadowFor(element)}
          >
            <ElementContent element={element} />
          </Group>
        ))}
      </Layer>
    </Stage>
  )
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Renders a page offscreen and returns its canvas. */
export async function renderPage(page: Page, pixelScale = 2): Promise<HTMLCanvasElement> {
  await preloadPage(page)

  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none;'
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    root.render(<OffscreenPage page={page} scale={pixelScale} />)
    // Two frames: one to commit the React tree, one for Konva to paint it.
    await nextFrame()
    await nextFrame()

    // Konva uses one canvas per layer; flatten them in order.
    const canvases = [...host.querySelectorAll('canvas')]
    if (canvases.length === 0) throw new Error('Export renderer produced no canvas.')

    const out = document.createElement('canvas')
    out.width = Math.round(PAGE_W * pixelScale)
    out.height = Math.round(PAGE_H * pixelScale)
    const ctx = out.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable.')
    ctx.imageSmoothingQuality = 'high'

    // Each layer's backing store is stage size x Konva's pixelRatio, which
    // follows devicePixelRatio. Blitting at natural size would therefore crop
    // to the top-left on any retina display, so draw to explicit bounds.
    for (const layer of canvases) {
      ctx.drawImage(layer, 0, 0, out.width, out.height)
    }
    return out
  } finally {
    root.unmount()
    host.remove()
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
      type,
      quality,
    )
  })
}

export async function pageToPngBlob(page: Page, pixelScale = 2.5): Promise<Blob> {
  const canvas = await renderPage(page, pixelScale)
  return canvasToBlob(canvas, 'image/png')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Share a page as an image via the OS share sheet where available.
 * Returns false when sharing isn't possible, so callers can fall back to a
 * download rather than silently doing nothing.
 */
export async function sharePageImage(page: Page, title: string): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false
  const blob = await pageToPngBlob(page, 2)
  const file = new File([blob], `${slug(title)}.png`, { type: 'image/png' })

  if (navigator.canShare && !navigator.canShare({ files: [file] })) return false
  try {
    await navigator.share({ files: [file], title })
    return true
  } catch (error) {
    // AbortError means the user dismissed the sheet — not a failure.
    if ((error as Error)?.name === 'AbortError') return true
    return false
  }
}

export interface PdfProgress {
  (done: number, total: number): void
}

/**
 * Whole journal as a PDF, one page per page.
 *
 * jsPDF is imported dynamically: it's a few hundred kilobytes that only matters
 * at the moment someone actually exports, and most sessions never will.
 */
export async function journalToPdf(
  journal: Journal,
  pages: Page[],
  onProgress?: PdfProgress,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: PAGE_W > PAGE_H ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [PAGE_W * 0.5, PAGE_H * 0.5],
    compress: true,
  })

  const ordered = pages.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))

  for (let i = 0; i < ordered.length; i++) {
    const canvas = await renderPage(ordered[i], 2)
    // JPEG rather than PNG: a scrapbook page is mostly photographic, and a
    // 40-page PNG PDF is large enough to be a problem to share.
    const data = canvas.toDataURL('image/jpeg', 0.9)
    if (i > 0) doc.addPage([PAGE_W * 0.5, PAGE_H * 0.5])
    doc.addImage(data, 'JPEG', 0, 0, PAGE_W * 0.5, PAGE_H * 0.5, undefined, 'FAST')
    onProgress?.(i + 1, ordered.length)
  }

  doc.setProperties({ title: journal.title, creator: 'Pagebound' })
  return doc.output('blob')
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'pagebound'
}
