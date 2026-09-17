import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { toast } from '../ui/Toast'
import { useLibrary } from '@/store/library'
import { importImage } from '@/lib/image'
import { createPhoto, createTape, createText } from '@/lib/elements'
import { todayKey } from '@/lib/date'
import { PAGE_H, PAGE_W } from '@/lib/constants'
import { haptic } from '@/lib/motion'
import type { PageElement } from '@/lib/types'

/**
 * Quick capture: a photo and one line, arranged for you.
 *
 * The point is to get something *down* in under ten seconds while you're still
 * standing there. The layout it produces — photo centred, taped at two corners,
 * a line of handwriting beneath — is a decent page on its own, so "arrange it
 * later" is genuinely optional rather than homework.
 */
export function QuickCaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const journals = useLibrary((s) => s.journals)
  const createPage = useLibrary((s) => s.createPage)
  const createJournal = useLibrary((s) => s.createJournal)

  const [assetId, setAssetId] = useState<string | null>(null)
  const [ratio, setRatio] = useState(1)
  const [preview, setPreview] = useState<string | null>(null)
  const [line, setLine] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  function reset() {
    setAssetId(null); setPreview(null); setLine(''); setBusy(false); setRatio(1)
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const imported = await importImage(file)
      setAssetId(imported.asset.id)
      setRatio(imported.ratio)
      setPreview(URL.createObjectURL(imported.asset.thumb))
    } catch (error) {
      console.error(error)
      toast('That image could not be read.', { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  async function save(openEditor: boolean) {
    setBusy(true)
    try {
      const journalId = journals[0]?.id ?? (await createJournal({ title: 'My journal' })).id
      const elements: PageElement[] = []

      if (assetId) {
        const photo = createPhoto(assetId, ratio, {
          x: PAGE_W / 2,
          y: PAGE_H * 0.42,
          frame: 'polaroid',
        })
        elements.push(photo)

        // Tape both top corners, angled outward, the way you'd actually do it.
        const halfW = photo.width / 2
        const halfH = photo.height / 2
        elements.push(createTape('plain', {
          x: photo.x - halfW + 20, y: photo.y - halfH + 10, width: 260,
        }))
        elements.push(createTape('stripe', {
          x: photo.x + halfW - 20, y: photo.y - halfH + 10, width: 260,
        }))
      }

      if (line.trim()) {
        elements.push(createText(line.trim(), {
          x: PAGE_W / 2,
          y: assetId ? PAGE_H * 0.78 : PAGE_H * 0.42,
          font: 'caveat',
          fontSize: 52,
          align: 'center',
        }))
      }

      const page = await createPage(journalId, { date: todayKey(), elements })
      haptic('place')
      onClose()
      reset()
      if (openEditor) navigate(`/page/${page.id}`)
      else toast('Saved to today.', { tone: 'good', icon: 'check' })
    } catch (error) {
      console.error(error)
      toast('Could not save that.', { tone: 'warn' })
      setBusy(false)
    }
  }

  const empty = !assetId && !line.trim()

  return (
    <Sheet
      open={open}
      onClose={() => { onClose(); reset() }}
      title="Quick capture"
      subtitle="Grab it now, arrange it later."
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-quiet" onClick={() => void save(false)} disabled={empty || busy}>
            Save for later
          </button>
          <button type="button" className="btn-primary" onClick={() => void save(true)} disabled={empty || busy}>
            Save &amp; arrange
          </button>
        </div>
      }
    >
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-rule
          grid place-items-center overflow-hidden relative mb-4
          hover:border-terracotta-deep/50 transition-colors"
      >
        {preview ? (
          <img src={preview} alt="Selected photo" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-ink-faint">
            <Icon name="camera" size={30} />
            <span className="text-sm font-medium">{busy ? 'Reading…' : 'Add a photo'}</span>
          </span>
        )}
      </button>

      <label className="block">
        <span className="label">One line</span>
        <input
          className="field"
          value={line}
          onChange={(event) => setLine(event.target.value)}
          placeholder="What&rsquo;s happening?"
          maxLength={120}
          style={{ fontFamily: 'Caveat, cursive', fontSize: 22 }}
        />
      </label>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = '' }}
      />
    </Sheet>
  )
}
