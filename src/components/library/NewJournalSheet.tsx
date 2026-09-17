import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../ui/Sheet'
import { Field, Swatches } from '../ui/Controls'
import { Icon } from '../ui/Icon'
import { toast } from '../ui/Toast'
import { COVERS, coverBackground, coverInk, DEFAULT_COVER_COLOR } from '@/content/covers'
import { useLibrary } from '@/store/library'
import { importImage } from '@/lib/image'
import { haptic } from '@/lib/motion'
import type { CoverStyle } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
}

export function NewJournalSheet({ open, onClose }: Props) {
  const navigate = useNavigate()
  const createJournal = useLibrary((s) => s.createJournal)
  const createPage = useLibrary((s) => s.createPage)

  const [title, setTitle] = useState('')
  const [style, setStyle] = useState<CoverStyle>('fabric')
  const [color, setColor] = useState(DEFAULT_COVER_COLOR)
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const spec = COVERS.find((c) => c.id === style)!

  function reset() {
    setTitle(''); setStyle('fabric'); setColor(DEFAULT_COVER_COLOR)
    setCoverImage(null); setCoverPreview(null); setBusy(false)
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const { asset } = await importImage(file)
      setCoverImage(asset.id)
      setCoverPreview(URL.createObjectURL(asset.thumb))
      setStyle('photo')
    } catch (error) {
      console.error(error)
      toast('That image could not be read.', { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  async function create() {
    setBusy(true)
    try {
      const journal = await createJournal({
        title: title.trim() || 'Untitled journal',
        coverStyle: style,
        color,
        coverImage: style === 'photo' ? coverImage : null,
      })
      // Give the journal a first page straight away: an empty journal is a
      // dead end, and "new journal" almost always means "I want to write now".
      const page = await createPage(journal.id)
      haptic('place')
      onClose()
      reset()
      navigate(`/page/${page.id}`)
    } catch (error) {
      console.error(error)
      toast('Could not create that journal.', { tone: 'warn' })
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => { onClose(); reset() }}
      title="New journal"
      subtitle="Pick a cover. You can change it later."
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-quiet" onClick={() => { onClose(); reset() }}>Cancel</button>
          <button type="button" className="btn-primary" onClick={create} disabled={busy}>
            {busy ? 'Working…' : 'Create journal'}
          </button>
        </div>
      }
    >
      <div className="flex gap-5 mb-6">
        {/* Live preview — the whole point of a cover picker. */}
        <div
          className="relative shrink-0 w-[120px] rounded-[4px_8px_8px_4px] overflow-hidden shadow-book grain"
          style={{ height: 166, background: coverBackground(style, color) }}
        >
          {style === 'photo' && coverPreview && (
            <>
              <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
            </>
          )}
          <div className="absolute inset-y-0 left-0 w-2.5 bg-black/22" />
          <p
            className="absolute bottom-3 left-4 right-3 font-display text-sm font-semibold leading-tight line-clamp-3"
            style={{ color: coverInk(style, color) }}
          >
            {title.trim() || 'Untitled journal'}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <Field label="Title">
            <input
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Autumn, or Lisbon 2026"
              maxLength={60}
              autoComplete="off"
            />
          </Field>
          <Swatches
            label="Colour"
            value={color}
            colors={spec.palette}
            onChange={setColor}
            allowCustom
          />
        </div>
      </div>

      <span className="label">Material</span>
      <div role="radiogroup" aria-label="Cover material" className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {COVERS.map((cover) => {
          const active = cover.id === style
          return (
            <button
              key={cover.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (cover.id === 'photo') { fileInput.current?.click(); return }
                setStyle(cover.id)
                if (!cover.palette.includes(color)) setColor(cover.palette[0])
              }}
              className={`rounded-xl p-1.5 text-center transition-colors
                ${active ? 'bg-sunk ring-2 ring-ink' : 'hover:bg-sunk/60'}`}
            >
              <span
                className="block w-full aspect-[3/4] rounded-md shadow-paper grain relative overflow-hidden"
                style={{ background: coverBackground(cover.id, cover.palette[0]) }}
              >
                {cover.id === 'photo' && (
                  <span className="absolute inset-0 grid place-items-center text-white/90">
                    <Icon name="image" size={18} />
                  </span>
                )}
              </span>
              <span className="block text-[11px] mt-1 text-ink-soft leading-tight">{cover.name}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-ink-faint mt-2">{spec.blurb}</p>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => { void pickPhoto(event.target.files?.[0]); event.target.value = '' }}
      />
    </Sheet>
  )
}
