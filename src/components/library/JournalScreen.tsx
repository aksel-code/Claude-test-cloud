import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLibrary, pagesForJournal } from '@/store/library'
import { useAsync } from '@/hooks'
import { Icon } from '../ui/Icon'
import { Confirm, Sheet } from '../ui/Sheet'
import { EmptyState, Field, Swatches } from '../ui/Controls'
import { toast } from '../ui/Toast'
import { JournalCover } from './JournalCover'
import { PagePreview } from './PagePreview'
import { ExportSheet } from '../export/ExportSheet'
import { formatRelative, todayKey } from '@/lib/date'
import { COVERS } from '@/content/covers'
import { getMood } from '@/content/moods'
import type { CoverStyle, Page } from '@/lib/types'

export function JournalScreen() {
  const { journalId = '' } = useParams()
  const navigate = useNavigate()
  const journal = useLibrary((s) => s.journals.find((j) => j.id === journalId))
  const createPage = useLibrary((s) => s.createPage)
  const removeJournal = useLibrary((s) => s.removeJournal)
  const removePage = useLibrary((s) => s.removePage)

  const load = useCallback(() => pagesForJournal(journalId), [journalId])
  const { value: pages, reload } = useAsync<Page[]>(load, [journalId], [])

  const [editing, setEditing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null)

  if (!journal) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-10">
        <EmptyState
          icon="book"
          title="That journal is gone"
          body="It may have been deleted. Your other journals are still on the shelf."
          action={<Link to="/" className="btn-primary">Back to the library</Link>}
        />
      </div>
    )
  }

  async function addPage() {
    const page = await createPage(journal!.id, { date: todayKey() })
    navigate(`/page/${page.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 md:pt-8">
      <Link to="/" className="btn-ghost -ml-3 mb-3">
        <Icon name="chevronLeft" size={18} />
        Library
      </Link>

      <header className="flex flex-col sm:flex-row gap-5 sm:gap-7 mb-8">
        <JournalCover journal={journal} width={132} />

        <div className="flex-1 min-w-0 sm:pt-2">
          <h1 className="font-display text-3xl text-ink leading-tight text-balance">{journal.title}</h1>
          <p className="text-ink-soft mt-1.5">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            {pages.length > 0 && <> &middot; last written {formatRelative(pages[0].date)}</>}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" onClick={addPage} className="btn-primary">
              <Icon name="plus" size={18} />
              New page
            </button>
            {pages.length > 0 && (
              <Link to={`/read/${journal.id}`} className="btn-outline">
                <Icon name="book" size={18} />
                Read
              </Link>
            )}
            <button type="button" onClick={() => setExporting(true)} className="btn-ghost" disabled={pages.length === 0}>
              <Icon name="download" size={18} />
              Export
            </button>
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost">
              <Icon name="palette" size={18} />
              Cover
            </button>
          </div>
        </div>
      </header>

      {pages.length === 0 ? (
        <EmptyState
          icon="text"
          title="An empty journal"
          body="Every scrapbook starts this way. Add a page and put something on it."
          action={<button type="button" onClick={addPage} className="btn-primary">Add the first page</button>}
        />
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {pages.map((page) => {
            const mood = getMood(page.mood)
            return (
              <li key={page.id} className="group relative">
                <Link
                  to={`/page/${page.id}`}
                  className="block rounded-xl overflow-hidden border border-rule shadow-paper
                    transition-all duration-200 ease-spring
                    hover:shadow-lift hover:-translate-y-1"
                >
                  <PagePreview page={page} label={`Page from ${formatRelative(page.date)}`} />
                </Link>

                <div className="flex items-start gap-1.5 mt-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {page.title || formatRelative(page.date)}
                    </p>
                    <p className="text-xs text-ink-faint truncate">
                      {page.title ? formatRelative(page.date) : `${page.elements.length} pieces`}
                      {page.tags.length > 0 && <> &middot; #{page.tags[0]}</>}
                    </p>
                  </div>
                  {mood && (
                    <span
                      className="shrink-0 w-3 h-3 rounded-full mt-1"
                      style={{ background: mood.color }}
                      title={`Mood: ${mood.label}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setPageToDelete(page)}
                    className="tap !min-w-0 !min-h-0 w-7 h-7 -mt-0.5 rounded-lg text-ink-faint
                      opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                      hover:text-terracotta-deep hover:bg-sunk transition-opacity"
                  >
                    <Icon name="trash" size={15} title={`Delete page from ${formatRelative(page.date)}`} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-14 pt-6 border-t border-rule">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="btn-ghost text-terracotta-deep hover:bg-terracotta/10"
        >
          <Icon name="trash" size={18} />
          Delete this journal
        </button>
      </div>

      <CoverEditor
        open={editing}
        onClose={() => setEditing(false)}
        journalId={journal.id}
      />

      <ExportSheet
        open={exporting}
        onClose={() => setExporting(false)}
        journal={journal}
        pages={pages}
      />

      <Confirm
        open={confirmDelete}
        title={`Delete "${journal.title}"?`}
        body={`This removes the journal and all ${pages.length} of its pages from this device. It cannot be undone.`}
        confirmLabel="Delete journal"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await removeJournal(journal.id)
          toast('Journal deleted.')
          navigate('/')
        }}
      />

      <Confirm
        open={pageToDelete !== null}
        title="Delete this page?"
        body="The page and anything on it will be removed from this device. It cannot be undone."
        confirmLabel="Delete page"
        destructive
        onCancel={() => setPageToDelete(null)}
        onConfirm={async () => {
          if (!pageToDelete) return
          await removePage(pageToDelete.id)
          setPageToDelete(null)
          reload()
          toast('Page deleted.')
        }}
      />
    </div>
  )
}

function CoverEditor({ open, onClose, journalId }: { open: boolean; onClose: () => void; journalId: string }) {
  const journal = useLibrary((s) => s.journals.find((j) => j.id === journalId))
  const updateJournal = useLibrary((s) => s.updateJournal)
  const [title, setTitle] = useState(journal?.title ?? '')

  if (!journal) return null
  const spec = COVERS.find((c) => c.id === journal.coverStyle) ?? COVERS[0]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cover"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              await updateJournal(journal.id, { title: title.trim() || journal.title })
              onClose()
            }}
          >
            Done
          </button>
        </div>
      }
    >
      <div className="flex justify-center mb-5">
        <JournalCover journal={{ ...journal, title: title || journal.title }} width={140} />
      </div>

      <Field label="Title">
        <input
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={60}
        />
      </Field>

      <div className="mb-4">
        <Swatches
          label="Colour"
          value={journal.color}
          colors={spec.palette}
          onChange={(color) => void updateJournal(journal.id, { color })}
          allowCustom
        />
      </div>

      <span className="label">Material</span>
      <div role="radiogroup" aria-label="Cover material" className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {COVERS.filter((c) => c.id !== 'photo').map((cover) => (
          <button
            key={cover.id}
            type="button"
            role="radio"
            aria-checked={cover.id === journal.coverStyle}
            onClick={() => void updateJournal(journal.id, { coverStyle: cover.id as CoverStyle })}
            className={`rounded-xl p-1.5 transition-colors
              ${cover.id === journal.coverStyle ? 'bg-sunk ring-2 ring-ink' : 'hover:bg-sunk/60'}`}
          >
            <span className="block w-full aspect-[3/4] rounded-md shadow-paper grain"
              style={{ background: COVERS.find((c) => c.id === cover.id)!.palette[0] }} />
            <span className="block text-[11px] mt-1 text-ink-soft">{cover.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
