import { useEffect, useState } from 'react'
import { coverBackground, coverInk, spineBackground } from '@/content/covers'
import { assetUrl } from '@/lib/image'
import { seededSpread } from '@/lib/id'
import type { Journal } from '@/lib/types'

interface Props {
  journal: Journal
  /** Cover width in px; height follows the 1:1.38 book ratio. */
  width?: number
  className?: string
}

/**
 * A book cover. Built from CSS rather than images so it recolours instantly and
 * stays sharp from a 72px strip tile to a full-width hero.
 *
 * The details that sell it: a darker spine with a highlight, page edges peeking
 * out on the fore-edge, and a tiny per-journal tilt so a shelf of them doesn't
 * look like a spreadsheet.
 */
export function JournalCover({ journal, width = 168, className = '' }: Props) {
  const [photo, setPhoto] = useState<string | null>(null)
  const height = Math.round(width * 1.38)
  const ink = coverInk(journal.coverStyle, journal.color)

  useEffect(() => {
    let live = true
    if (journal.coverStyle === 'photo' && journal.coverImage) {
      void assetUrl(journal.coverImage, 'full').then((url) => { if (live) setPhoto(url) })
    } else {
      setPhoto(null)
    }
    return () => { live = false }
  }, [journal.coverStyle, journal.coverImage])

  const titleSize = width < 110 ? 12 : width < 150 ? 14 : 17

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width, height, transform: `rotate(${seededSpread(journal.id, 1.1).toFixed(2)}deg)` }}
    >
      {/* Page block peeking out along the fore-edge. */}
      <div
        className="absolute rounded-r-[3px]"
        style={{
          inset: `3px -3px 5px auto`,
          width: width * 0.94,
          left: 5,
          background: 'repeating-linear-gradient(90deg,#FBF7EF 0 2px,#E6DECF 2px 3px)',
          boxShadow: '0 1px 2px rgb(43 42 40 / 0.2)',
        }}
        aria-hidden="true"
      />

      <div
        className="relative w-full h-full rounded-[4px_8px_8px_4px] overflow-hidden shadow-book grain"
        style={{ background: coverBackground(journal.coverStyle, journal.color) }}
      >
        {photo && (
          <img
            src={photo}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        {photo && <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />}

        {/* Spine. */}
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: Math.max(9, width * 0.075), background: spineBackground(journal.coverStyle, journal.color) }}
          aria-hidden="true"
        />

        <div
          className="absolute inset-y-0 left-0 w-[3px] bg-white/15"
          style={{ left: Math.max(9, width * 0.075) }}
          aria-hidden="true"
        />

        <div
          className="absolute inset-x-0 bottom-0 flex flex-col justify-end"
          style={{ paddingLeft: Math.max(16, width * 0.14), paddingRight: 12, paddingBottom: 14 }}
        >
          <h3
            className="font-display font-semibold leading-tight line-clamp-3 text-balance"
            style={{ color: ink, fontSize: titleSize, textShadow: photo ? '0 1px 4px rgb(0 0 0 / .5)' : undefined }}
          >
            {journal.title}
          </h3>
          {width >= 130 && (
            <p
              className="text-[11px] mt-1 tabular-nums"
              style={{ color: ink, opacity: 0.68 }}
            >
              {journal.pageIds.length} {journal.pageIds.length === 1 ? 'page' : 'pages'}
            </p>
          )}
        </div>

        {/* Gloss across the top-left corner, the way light hits a real cover. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(145deg, rgb(255 255 255 / .16), transparent 42%)' }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
