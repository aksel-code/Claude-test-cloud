import { useMemo, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { Swatches } from '../ui/Controls'
import { Icon } from '../ui/Icon'
import { useEditor } from '@/store/editor'
import {
  findSticker, searchStickers, stickerPacks, stickerSvg, type Sticker,
} from '@/content/stickers'
import { TAPES, tapeCss } from '@/content/tapes'
import { NOTES } from '@/content/notes'
import { PAPERS, backgroundCss, paperSpec } from '@/content/papers'
import { createNote, createShape, createSticker, createTape } from '@/lib/elements'
import { INK_SWATCHES, PAPER_SWATCHES, PAGE_W, PAGE_H } from '@/lib/constants'
import { haptic } from '@/lib/motion'
import { rankByUsage, recordUsage, topUsageKeys } from '@/lib/usage'
import type { BackgroundKind, ShapeKind } from '@/lib/types'

/**
 * Element pickers.
 *
 * All of them place onto the page and close immediately: the fastest path from
 * "I want tape here" to tape being there is one tap, then drag it where it goes.
 * Placement lands slightly off-centre and randomised, because a stack of things
 * all dropped at dead centre is both ugly and annoying to pull apart.
 */

function dropPoint(index = 0) {
  const spread = 90
  return {
    x: PAGE_W / 2 + (Math.random() - 0.5) * spread + index * 6,
    y: PAGE_H * 0.42 + (Math.random() - 0.5) * spread + index * 6,
  }
}

/* --------------------------------------------------------------- stickers */

const RECENT_STICKER_PREFIX = 'sticker:'

export function StickerPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addElement = useEditor((s) => s.addElement)
  const [query, setQuery] = useState('')
  const [tint, setTint] = useState('#C8674A')
  const packs = stickerPacks()

  // Recent, on this device only: no network, no AI — just a tally of what got
  // placed before, so the picker opens on what you actually reach for instead
  // of always making you re-browse from pack one. Small list (<=12), so it's
  // recomputed on every render rather than memoized against `open` — that's
  // also what makes it pick up a placement immediately after it happens.
  const recentStickers = topUsageKeys(RECENT_STICKER_PREFIX, 12)
    .map((key) => {
      const [, packId, stickerId] = key.split(':')
      const sticker = findSticker(packId, stickerId)
      return sticker ? { ...sticker, packId } : null
    })
    .filter((s): s is Sticker & { packId: string } => s !== null)
  const [packId, setPackId] = useState(() => (recentStickers.length > 0 ? 'recent' : packs[0]?.id ?? 'nature'))

  const results = useMemo(() => {
    if (query.trim()) return searchStickers(query).map((r) => ({ ...r.sticker, packId: r.pack.id }))
    if (packId === 'recent') return recentStickers
    const pack = packs.find((p) => p.id === packId) ?? packs[0]
    return pack ? pack.stickers.map((s) => ({ ...s, packId: pack.id })) : []
  }, [query, packId, packs, recentStickers])

  function place(sticker: Sticker & { packId: string }) {
    addElement(createSticker(sticker.packId, sticker.id, {
      ...dropPoint(),
      tint: sticker.tintable ? tint : undefined,
    }))
    recordUsage(`${RECENT_STICKER_PREFIX}${sticker.packId}:${sticker.id}`)
    haptic('place')
    onClose()
  }

  const anyTintable = results.some((s) => s.tintable)

  return (
    <Sheet open={open} onClose={onClose} title="Stickers" width="lg">
      <div className="sticky top-0 -mt-1 pt-1 pb-3 bg-page z-10">
        <div className="relative mb-3">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="field pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stickers"
            type="search"
            aria-label="Search stickers"
          />
        </div>

        {!query.trim() && (
          <div role="tablist" aria-label="Sticker packs" className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {recentStickers.length > 0 && (
              <button
                role="tab"
                type="button"
                aria-selected={packId === 'recent'}
                onClick={() => setPackId('recent')}
                className={`tap shrink-0 px-3.5 rounded-full text-sm font-medium transition-colors
                  ${packId === 'recent' ? 'bg-ink text-page' : 'bg-sunk text-ink-soft hover:text-ink'}`}
              >
                Recent
              </button>
            )}
            {packs.map((pack) => (
              <button
                key={pack.id}
                role="tab"
                type="button"
                aria-selected={pack.id === packId}
                onClick={() => setPackId(pack.id)}
                className={`tap shrink-0 px-3.5 rounded-full text-sm font-medium transition-colors
                  ${pack.id === packId ? 'bg-ink text-page' : 'bg-sunk text-ink-soft hover:text-ink'}`}
              >
                {pack.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {anyTintable && (
        <div className="mb-4">
          <Swatches label="Colour for plain shapes" value={tint} colors={INK_SWATCHES} onChange={setTint} allowCustom />
        </div>
      )}

      {results.length === 0 ? (
        <p className="text-ink-soft py-8 text-center">Nothing matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {results.map((sticker) => (
            <li key={`${sticker.packId}:${sticker.id}`}>
              <button
                type="button"
                onClick={() => place(sticker)}
                className="w-full aspect-square rounded-xl bg-surface border border-rule p-2
                  grid place-items-center transition-all duration-150 ease-spring
                  hover:scale-[1.07] hover:shadow-lift hover:border-ink-faint active:scale-95"
                title={sticker.name}
              >
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                    stickerSvg(sticker, sticker.tintable ? tint : undefined))}`}
                  alt={sticker.name}
                  className="max-w-full max-h-full drag-none"
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

/* ------------------------------------------------------------------- tape */

export function TapePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addElement = useEditor((s) => s.addElement)
  const [color, setColor] = useState<string | null>(null)
  // Most-reached-for tape first, on this device only — see lib/usage.ts.
  const tapes = rankByUsage(TAPES, (t) => `tape:${t.id}`)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Washi tape"
      subtitle="Tape lands at an angle. Drag it over a photo corner."
    >
      <ul className="space-y-2.5 mb-5">
        {tapes.map((tape) => (
          <li key={tape.id}>
            <button
              type="button"
              onClick={() => {
                addElement(createTape(tape.id, { ...dropPoint(), color: color ?? tape.color }))
                recordUsage(`tape:${tape.id}`)
                haptic('place')
                onClose()
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sunk
                transition-colors group text-left"
            >
              <span
                className="h-11 flex-1 rounded-[2px] shadow-paper transition-transform
                  duration-200 ease-spring group-hover:-rotate-1 group-hover:scale-[1.02]"
                style={{
                  background: tapeCss(tape, color ?? tape.color),
                  opacity: tape.alpha,
                }}
              />
              <span className="w-28 text-sm text-ink-soft shrink-0">{tape.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <Swatches
        label="Tint (optional)"
        value={color ?? ''}
        colors={PAPER_SWATCHES}
        onChange={setColor}
        allowCustom
      />
      {color && (
        <button type="button" className="btn-ghost mt-2 text-sm" onClick={() => setColor(null)}>
          Use each tape&rsquo;s own colour
        </button>
      )}
    </Sheet>
  )
}

/* ------------------------------------------------------------------ notes */

export function NotePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addElement = useEditor((s) => s.addElement)
  const notes = rankByUsage(NOTES, (n) => `note:${n.id}`)

  return (
    <Sheet open={open} onClose={onClose} title="Notes" subtitle="Paper to write on. Double-tap to type.">
      <ul className="grid grid-cols-2 gap-3">
        {notes.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => {
                addElement(createNote(note.id, dropPoint()))
                recordUsage(`note:${note.id}`)
                haptic('place')
                onClose()
              }}
              className="w-full p-3 rounded-xl border border-rule bg-surface
                transition-all duration-150 ease-spring hover:shadow-lift hover:-translate-y-0.5"
            >
              <span
                className="block w-full aspect-[4/3] rounded shadow-paper mb-2"
                style={{ background: note.defaultPaper }}
              />
              <span className="text-sm font-medium text-ink">{note.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/* ----------------------------------------------------------------- shapes */

const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: 'line', label: 'Line' },
  { id: 'underline', label: 'Underline' },
  { id: 'divider', label: 'Divider' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'circle', label: 'Circle' },
  { id: 'star', label: 'Star' },
]

export function ShapePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addElement = useEditor((s) => s.addElement)
  const [color, setColor] = useState('#2B2A28')
  const shapes = rankByUsage(SHAPES, (s) => `shape:${s.id}`)

  return (
    <Sheet open={open} onClose={onClose} title="Lines & shapes">
      <div className="mb-5">
        <Swatches label="Ink" value={color} colors={INK_SWATCHES} onChange={setColor} allowCustom />
      </div>
      <ul className="grid grid-cols-3 gap-2.5">
        {shapes.map((shape) => (
          <li key={shape.id}>
            <button
              type="button"
              onClick={() => {
                addElement(createShape(shape.id, { ...dropPoint(), color }))
                recordUsage(`shape:${shape.id}`)
                haptic('place')
                onClose()
              }}
              className="w-full aspect-[4/3] rounded-xl border border-rule bg-surface
                grid place-items-center gap-1 transition-all duration-150 ease-spring
                hover:shadow-lift hover:-translate-y-0.5"
            >
              <ShapeGlyph kind={shape.id} color={color} />
              <span className="text-xs text-ink-soft">{shape.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function ShapeGlyph({ kind, color }: { kind: ShapeKind; color: string }) {
  const common = { stroke: color, strokeWidth: 3.2, fill: 'none', strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 64 36" className="w-14 h-9" aria-hidden="true">
      {kind === 'line' && <path d="M4 24Q32 12 60 22" {...common} />}
      {kind === 'underline' && (
        <>
          <path d="M6 18Q32 10 58 19" {...common} />
          <path d="M10 26Q32 20 54 27" {...common} strokeWidth={2.2} opacity={0.6} />
        </>
      )}
      {kind === 'divider' && (
        <>
          <path d="M4 18h18M42 18h18" {...common} />
          <path d="M32 9l3 7 7 2-7 2-3 7-3-7-7-2 7-2Z" fill={color} stroke="none" />
        </>
      )}
      {kind === 'arrow' && (
        <>
          <path d="M6 30Q26 6 52 16" {...common} />
          <path d="M42 10l11 6-8 8" {...common} strokeLinejoin="round" />
        </>
      )}
      {kind === 'circle' && <ellipse cx="32" cy="18" rx="17" ry="13" {...common} />}
      {kind === 'star' && (
        <path d="M32 4l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill={color} stroke="none" />
      )}
    </svg>
  )
}

/* ------------------------------------------------------------ backgrounds */

export function BackgroundPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const background = useEditor((s) => s.background)
  const setBackground = useEditor((s) => s.setBackground)

  return (
    <Sheet open={open} onClose={onClose} title="Paper">
      <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-6">
        {PAPERS.map((paper) => {
          const active = paper.kind === background.kind
          return (
            <li key={paper.kind}>
              <button
                type="button"
                onClick={() => setBackground({
                  kind: paper.kind as BackgroundKind,
                  color: paper.kind === 'custom' ? background.color : paper.defaultColor,
                  patternColor: paper.defaultPattern,
                })}
                className={`w-full rounded-xl p-1.5 transition-colors
                  ${active ? 'bg-sunk ring-2 ring-ink' : 'hover:bg-sunk/60'}`}
              >
                <span
                  className="block w-full aspect-[3/4] rounded-md border border-rule shadow-paper"
                  style={{ background: backgroundCss({
                    kind: paper.kind as BackgroundKind,
                    color: paper.kind === 'custom' ? background.color : paper.defaultColor,
                    patternColor: paper.defaultPattern,
                  }) }}
                />
                <span className="block text-[11px] mt-1.5 text-ink-soft">{paper.name}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <Swatches
        label="Paper colour"
        value={background.color}
        colors={PAPER_SWATCHES}
        onChange={(color) => setBackground({ ...background, color })}
        allowCustom
      />

      {background.kind !== 'cream' && background.kind !== 'custom' && background.kind !== 'watercolor' && (
        <div className="mt-4">
          <Swatches
            label="Rule colour"
            value={background.patternColor ?? paperSpec(background.kind).defaultPattern}
            colors={['#B9AE9B', '#C9BFAC', '#B7C6D2', '#CBD6CC', '#D8A79C', '#8A8377']}
            onChange={(patternColor) => setBackground({ ...background, patternColor })}
            allowCustom
          />
        </div>
      )}
    </Sheet>
  )
}
