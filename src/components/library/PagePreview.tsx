import { useEffect, useRef, useState } from 'react'
import { getThumb, putThumb } from '@/lib/db'
import { backgroundCss } from '@/content/papers'
import { PAGE_RATIO, PAGE_THUMB_WIDTH, PAGE_W } from '@/lib/constants'
import type { Page } from '@/lib/types'

interface Props {
  page: Page
  className?: string
  /** Rendered into the image's alt text. */
  label?: string
  /**
   * 'ratio' (default) sizes the tile to the page's 3:4 shape.
   * 'fill' stretches it to a positioned parent instead — passing `absolute`
   * through `className` would not work, because Tailwind emits `relative`
   * after `absolute` and the base class would win the cascade.
   */
  fit?: 'ratio' | 'fill'
}

/**
 * Thumbnails are normally written by the editor's autosave. Pages that have
 * never been opened — seeded demo content, or anything imported — have none, so
 * the first view that needs one renders and stores it.
 *
 * Renders are serialised through this queue. A journal with twenty missing
 * thumbnails would otherwise fire twenty offscreen Konva stages at once and
 * lock the main thread solid.
 */
let chain: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.catch(() => {})
  return run
}

async function buildThumb(page: Page): Promise<Blob | null> {
  // Dynamic: this pulls in Konva, and the library shouldn't load it just to
  // draw a grid of tiles that usually already have thumbnails.
  const { renderPage } = await import('@/lib/export')
  const canvas = await renderPage(page, PAGE_THUMB_WIDTH / PAGE_W)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.72))
  if (blob) {
    await putThumb({ pageId: page.id, journalId: page.journalId, blob, updatedAt: Date.now() })
  }
  return blob
}

export function PagePreview({ page, className = '', label, fit = 'ratio' }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = host.current
    if (!node || visible) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) setVisible(true) },
      { rootMargin: '300px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    let live = true
    let objectUrl: string | null = null

    void (async () => {
      let blob = (await getThumb(page.id))?.blob ?? null
      if (!blob && live) {
        try {
          blob = await enqueue(() => buildThumb(page))
        } catch (error) {
          console.warn('[pagebound] could not render a thumbnail', error)
        }
      }
      if (!blob || !live) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })()

    return () => {
      live = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [visible, page])

  return (
    <div
      ref={host}
      className={`overflow-hidden bg-surface ${fit === 'fill' ? 'absolute inset-0' : 'relative'} ${className}`}
      style={{
        aspectRatio: fit === 'fill' ? undefined : PAGE_RATIO,
        background: backgroundCss(page.background),
      }}
    >
      {url && (
        <img
          src={url}
          alt={label ?? ''}
          className="absolute inset-0 w-full h-full object-cover animate-fade-up"
          style={{ animationDuration: '260ms' }}
          decoding="async"
        />
      )}
    </div>
  )
}
