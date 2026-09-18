import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { getPagesForJournal } from '@/lib/db'
import { useLibrary } from '@/store/library'
import { renderPage } from '@/lib/export'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/Controls'
import { formatLong, weekdayName } from '@/lib/date'
import { prefersReducedMotion } from '@/lib/motion'
import { PAGE_RATIO } from '@/lib/constants'
import type { Page } from '@/lib/types'

/**
 * Reading mode.
 *
 * Pages are rendered at full resolution through the same offscreen renderer the
 * export uses, then cached per page — a thumbnail scaled up to full screen
 * looks like exactly what it is. Neighbours are rendered ahead of time so a
 * flip never waits on a decode.
 *
 * The flip itself: the current page is a leaf that rotates about its spine
 * edge with `backface-visibility: hidden`, so it vanishes at 90 degrees and
 * reveals the next page already sitting underneath. Fast on purpose — 460ms,
 * because a slow page turn stops being charming around the third one.
 */
export default function ReaderScreen() {
  const { journalId = '' } = useParams()
  const navigate = useNavigate()
  const journal = useLibrary((s) => s.journals.find((j) => j.id === journalId))

  const load = useCallback(async () => {
    const pages = await getPagesForJournal(journalId)
    // Read oldest-first: a journal is read forwards.
    return pages.slice().reverse()
  }, [journalId])
  const { value: pages, loading } = useAsync<Page[]>(load, [journalId], [])

  const [index, setIndex] = useState(0)
  const [flip, setFlip] = useState<{ dir: 1 | -1 } | null>(null)
  const [drag, setDrag] = useState(0)
  const [chrome, setChrome] = useState(true)
  const dragStart = useRef<number | null>(null)
  const stage = useRef<HTMLDivElement>(null)

  const current = pages[index]
  const next = pages[index + 1]
  const previous = pages[index - 1]

  const images = usePageImages(pages, index)

  const turn = useCallback((dir: 1 | -1) => {
    setIndex((i) => {
      const target = i + dir
      if (target < 0 || target >= pages.length) return i
      if (!prefersReducedMotion()) setFlip({ dir })
      return target
    })
  }, [pages.length])

  useEffect(() => {
    if (!flip) return
    const id = setTimeout(() => setFlip(null), 470)
    return () => clearTimeout(id)
  }, [flip])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault(); turn(1); break
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault(); turn(-1); break
        case 'Home':
          event.preventDefault(); setIndex(0); break
        case 'End':
          event.preventDefault(); setIndex(pages.length - 1); break
        case 'Escape':
          navigate(`/journal/${journalId}`); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn, pages.length, navigate, journalId])

  if (!loading && pages.length === 0) {
    return (
      <div className="min-h-dvh grid place-items-center bg-page px-4">
        <EmptyState
          icon="book"
          title="Nothing to read yet"
          body="Add a page to this journal and it will appear here."
          action={<Link to={`/journal/${journalId}`} className="btn-primary">Back to the journal</Link>}
        />
      </div>
    )
  }

  const progress = pages.length > 1 ? index / (pages.length - 1) : 1

  return (
    <div
      className="h-dvh flex flex-col overflow-hidden select-none"
      style={{ background: 'rgb(var(--pb-canvas-backdrop))' }}
    >
      <header
        className={`flex items-center gap-2 px-2 h-14 shrink-0 safe-t transition-opacity duration-300
          ${chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <button
          type="button"
          onClick={() => navigate(`/journal/${journalId}`)}
          className="tap rounded-lg text-ink-soft hover:text-ink hover:bg-sunk"
        >
          <Icon name="close" size={22} title="Close reader" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-medium text-ink truncate">{journal?.title ?? 'Journal'}</p>
          <p className="text-xs text-ink-faint tabular-nums">
            {current ? `${weekdayName(current.date)}, ${formatLong(current.date)}` : ''}
          </p>
        </div>
        <span className="tap tech-label text-ink-faint">
          {String(index + 1).padStart(2, '0')}/{String(pages.length).padStart(2, '0')}
        </span>
      </header>

      <div
        ref={stage}
        className="flex-1 min-h-0 grid place-items-center px-3 pb-3 relative"
        onPointerDown={(event) => { dragStart.current = event.clientX }}
        onPointerMove={(event) => {
          if (dragStart.current === null) return
          setDrag(event.clientX - dragStart.current)
        }}
        onPointerUp={() => {
          const dx = drag
          dragStart.current = null
          setDrag(0)
          if (Math.abs(dx) < 48) { setChrome((c) => !c); return }
          turn(dx < 0 ? 1 : -1)
        }}
        onPointerCancel={() => { dragStart.current = null; setDrag(0) }}
      >
        <div
          className="relative h-full max-h-full"
          style={{ aspectRatio: PAGE_RATIO, perspective: 2200 }}
          role="group"
          aria-roledescription="book"
          aria-label={`Page ${index + 1} of ${pages.length}`}
        >
          {/* The page being revealed sits underneath the leaf. */}
          <Leaf image={current ? images.get(current.id) : undefined} page={current} />

          {/* The turning leaf: the page we just left, rotating away. */}
          {flip && (
            <div
              className="absolute inset-0"
              style={{
                transformStyle: 'preserve-3d',
                transformOrigin: flip.dir === 1 ? 'left center' : 'right center',
                animation: `pb-flip-${flip.dir === 1 ? 'fwd' : 'back'} 460ms cubic-bezier(0.4, 0.05, 0.25, 1) both`,
                backfaceVisibility: 'hidden',
                willChange: 'transform',
              }}
            >
              <Leaf
                image={flip.dir === 1
                  ? (previous ? images.get(previous.id) : undefined)
                  : (next ? images.get(next.id) : undefined)}
                page={flip.dir === 1 ? previous : next}
                shading
              />
            </div>
          )}

          {/* Live drag preview: the corner lifts as you pull. */}
          {drag !== 0 && !flip && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transformOrigin: drag < 0 ? 'left center' : 'right center',
                transform: `rotateY(${Math.max(-42, Math.min(42, drag * -0.14))}deg)`,
                backfaceVisibility: 'hidden',
              }}
            >
              <Leaf image={current ? images.get(current.id) : undefined} page={current} shading />
            </div>
          )}

          {/* Spine shadow, so the page reads as bound rather than floating. */}
          <div
            className="absolute inset-y-0 left-0 w-10 pointer-events-none rounded-l-[2px]"
            style={{ background: 'linear-gradient(90deg, rgb(43 42 40 / .26), transparent)' }}
            aria-hidden="true"
          />
        </div>

        {/* Desktop click targets on either side. */}
        <button
          type="button"
          onClick={() => turn(-1)}
          disabled={index === 0}
          aria-label="Previous page"
          className={`hidden md:grid absolute left-4 top-1/2 -translate-y-1/2 place-items-center
            w-12 h-12 rounded-full bg-surface/85 border border-rule shadow-lift text-ink
            disabled:opacity-0 transition-opacity ${chrome ? '' : 'opacity-0'}`}
        >
          <Icon name="chevronLeft" size={22} />
        </button>
        <button
          type="button"
          onClick={() => turn(1)}
          disabled={index >= pages.length - 1}
          aria-label="Next page"
          className={`hidden md:grid absolute right-4 top-1/2 -translate-y-1/2 place-items-center
            w-12 h-12 rounded-full bg-surface/85 border border-rule shadow-lift text-ink
            disabled:opacity-0 transition-opacity ${chrome ? '' : 'opacity-0'}`}
        >
          <Icon name="chevronRight" size={22} />
        </button>
      </div>

      <footer
        className={`shrink-0 px-4 pb-3 safe-b transition-opacity duration-300
          ${chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="h-1 rounded-full bg-rule/60 overflow-hidden mb-2">
          <div
            className="h-full bg-terracotta-deep transition-[width] duration-300 ease-settle"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-center text-xs text-ink-faint md:hidden">
          Swipe to turn &middot; tap to hide this
        </p>
        <p className="text-center text-xs text-ink-faint hidden md:block">
          Arrow keys to turn &middot; Esc to close
        </p>
      </footer>

      {/* Keyframes are local to the reader; nothing else flips. */}
      <style>{`
        @keyframes pb-flip-fwd {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(-178deg); }
        }
        @keyframes pb-flip-back {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(178deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pb-flip-fwd  { from, to { transform: none; } }
          @keyframes pb-flip-back { from, to { transform: none; } }
        }
      `}</style>
    </div>
  )
}

function Leaf({ image, page, shading }: { image?: string; page?: Page; shading?: boolean }) {
  return (
    <div
      className="absolute inset-0 rounded-[2px] overflow-hidden shadow-float bg-surface"
      style={{ background: page?.background.color ?? '#FAF6EE' }}
    >
      {image ? (
        <img
          src={image}
          alt={page ? `Page from ${formatLong(page.date)}` : ''}
          className="w-full h-full object-contain drag-none"
          draggable={false}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-ink-faint text-sm">
          Rendering&hellip;
        </span>
      )}
      {shading && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgb(43 42 40 / .28), transparent 34%)' }}
        />
      )}
    </div>
  )
}

/**
 * Renders the current page plus its immediate neighbours, caching the results.
 * Object URLs are revoked on unmount; the cache is intentionally per-visit
 * rather than global, since a journal read is a bounded session.
 */
function usePageImages(pages: Page[], index: number) {
  const [images, setImages] = useState<Map<string, string>>(new Map())
  const urls = useRef<string[]>([])

  useEffect(() => () => {
    for (const url of urls.current) URL.revokeObjectURL(url)
    urls.current = []
  }, [])

  useEffect(() => {
    let live = true
    const wanted = [pages[index], pages[index + 1], pages[index - 1], pages[index + 2]]
      .filter((page): page is Page => Boolean(page))

    void (async () => {
      for (const page of wanted) {
        if (!live) return
        if (images.has(page.id)) continue
        try {
          const canvas = await renderPage(page, 1.4)
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88))
          if (!blob || !live) continue
          const url = URL.createObjectURL(blob)
          urls.current.push(url)
          setImages((current) => new Map(current).set(page.id, url))
        } catch (error) {
          console.error('[pagebound] could not render page for reading', error)
        }
      }
    })()

    return () => { live = false }
    // `images` is deliberately omitted: including it would re-run the effect on
    // every successful render and re-walk the list for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, index])

  return images
}
