import { useEffect, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { toast } from '../ui/Toast'
import { getPage } from '@/lib/db'
import {
  downloadBlob, journalToPdf, pageToPngBlob, sharePageImage, slug,
} from '@/lib/export'
import { formatShort } from '@/lib/date'
import { useEditor } from '@/store/editor'
import type { Journal, Page } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  journal: Journal
  pages: Page[]
  /** When set, the sheet exports this single page instead of the whole journal. */
  singlePageId?: string
}

/**
 * Export and share.
 *
 * The privacy line is load-bearing, not decoration: journals never leave the
 * device, and sharing a page means handing an image file to whatever the user
 * picks. Nothing is uploaded, and there is no "share a link" — a link would
 * need a server, and there isn't one.
 */
export function ExportSheet({ open, onClose, journal, pages, singlePageId }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [canShare, setCanShare] = useState(false)
  const flush = useEditor((s) => s.flush)

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function')
  }, [])

  async function currentPage(): Promise<Page | null> {
    if (!singlePageId) return null
    // Flush first so an export never captures a stale version of what's on screen.
    await flush()
    return (await getPage(singlePageId)) ?? null
  }

  async function exportPng() {
    setBusy('png')
    try {
      const page = await currentPage()
      if (!page) throw new Error('No page')
      const blob = await pageToPngBlob(page, 2.5)
      downloadBlob(blob, `${slug(journal.title)}-${page.date}.png`)
      toast('Page saved as a PNG.', { tone: 'good', icon: 'check' })
    } catch (error) {
      console.error(error)
      toast('Could not export that page.', { tone: 'warn' })
    } finally {
      setBusy(null)
    }
  }

  async function sharePng() {
    setBusy('share')
    try {
      const page = await currentPage()
      if (!page) throw new Error('No page')
      const shared = await sharePageImage(page, `${journal.title} — ${formatShort(page.date)}`)
      if (!shared) {
        const blob = await pageToPngBlob(page, 2.5)
        downloadBlob(blob, `${slug(journal.title)}-${page.date}.png`)
        toast('Sharing isn’t available here, so the image was saved instead.')
      }
    } catch (error) {
      console.error(error)
      toast('Could not share that page.', { tone: 'warn' })
    } finally {
      setBusy(null)
    }
  }

  async function exportPdf() {
    setBusy('pdf')
    setProgress({ done: 0, total: pages.length })
    try {
      const blob = await journalToPdf(journal, pages, (done, total) => setProgress({ done, total }))
      downloadBlob(blob, `${slug(journal.title)}.pdf`)
      toast('Journal saved as a PDF.', { tone: 'good', icon: 'check' })
    } catch (error) {
      console.error(error)
      toast('Could not build that PDF.', { tone: 'warn' })
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={singlePageId ? 'Share this page' : 'Export journal'}>
      <div className="space-y-2.5">
        {singlePageId ? (
          <>
            {canShare && (
              <ExportRow
                icon="share"
                title="Share as an image"
                body="Sends a PNG to whatever you pick — messages, mail, photos."
                busy={busy === 'share'}
                onClick={sharePng}
              />
            )}
            <ExportRow
              icon="download"
              title="Save a high-resolution PNG"
              body="2700 x 3600 pixels. Good enough to print."
              busy={busy === 'png'}
              onClick={exportPng}
            />
          </>
        ) : (
          <ExportRow
            icon="download"
            title="Whole journal as a PDF"
            body={`All ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}, oldest first.`}
            busy={busy === 'pdf'}
            onClick={exportPdf}
            disabled={pages.length === 0}
          />
        )}
      </div>

      {progress && (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-sunk overflow-hidden">
            <div
              className="h-full bg-terracotta-deep transition-[width] duration-200"
              style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
            />
          </div>
          <p className="text-sm text-ink-soft mt-2 text-center tabular-nums" role="status" aria-live="polite">
            Rendering page {progress.done} of {progress.total}&hellip;
          </p>
        </div>
      )}

      <p className="text-xs text-ink-faint mt-6 leading-relaxed border-t border-rule pt-4">
        Exports are generated on this device and saved to your downloads. Nothing is
        uploaded, and your journals stay private unless you share a file yourself.
      </p>
    </Sheet>
  )
}

function ExportRow({
  icon, title, body, busy, onClick, disabled,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  title: string
  body: string
  busy: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="w-full flex items-start gap-3.5 p-4 rounded-xl border border-rule bg-surface
        text-left transition-all duration-150 ease-settle
        hover:border-ink-faint hover:shadow-paper disabled:opacity-50"
    >
      <span className="shrink-0 w-10 h-10 rounded-xl bg-sunk grid place-items-center text-ink-soft">
        {busy
          ? <span className="w-4 h-4 rounded-full border-2 border-rule border-t-terracotta animate-spin" />
          : <Icon name={icon} size={20} />}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">{title}</span>
        <span className="block text-sm text-ink-soft mt-0.5 leading-snug">{body}</span>
      </span>
    </button>
  )
}
