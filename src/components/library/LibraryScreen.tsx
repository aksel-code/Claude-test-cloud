import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLibrary } from '@/store/library'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/Controls'
import { JournalCover } from './JournalCover'
import { PagePreview } from './PagePreview'
import { StreakChip } from './StreakChip'
import { NewJournalSheet } from './NewJournalSheet'
import { TodaySheet } from '../daily/TodaySheet'
import { QuickCaptureSheet } from '../daily/QuickCaptureSheet'
import { formatRelative } from '@/lib/date'
import { describeElement } from '@/lib/elements'
import type { Page } from '@/lib/types'

export function LibraryScreen() {
  const journals = useLibrary((s) => s.journals)
  const recent = useLibrary((s) => s.recent)
  const [newJournal, setNewJournal] = useState(false)
  const [today, setToday] = useState(false)
  const [quick, setQuick] = useState(false)

  const active = useMemo(() => journals.filter((j) => !j.archived), [journals])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-[2rem] md:text-4xl text-ink leading-none">Pagebound</h1>
          <p className="text-ink-soft mt-1.5">Your shelf.</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <StreakChip />
        </div>
      </header>

      {/* Today + quick capture: the two things someone opens the app to do. */}
      <div className="flex gap-2.5 mb-8">
        <button type="button" onClick={() => setToday(true)} className="btn-primary flex-1 sm:flex-none">
          <Icon name="plus" size={18} />
          Today&rsquo;s page
        </button>
        <button type="button" onClick={() => setQuick(true)} className="btn-outline">
          <Icon name="camera" size={18} />
          <span className="hidden sm:inline">Quick capture</span>
          <span className="sr-only sm:hidden">Quick capture</span>
        </button>
      </div>

      {recent.length > 0 && <RecentStrip pages={recent} />}

      <section aria-labelledby="journals-heading" className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 id="journals-heading" className="font-display text-xl text-ink">Journals</h2>
          <button type="button" onClick={() => setNewJournal(true)} className="btn-ghost">
            <Icon name="plus" size={18} />
            New journal
          </button>
        </div>

        {active.length === 0 ? (
          <EmptyState
            icon="book"
            title="Nothing on the shelf yet"
            body="A journal is just a place to keep pages. Make one for a trip, a season, or no reason at all."
            action={
              <button type="button" onClick={() => setNewJournal(true)} className="btn-primary">
                <Icon name="plus" size={18} />
                Make your first journal
              </button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 sm:gap-x-6">
            {active.map((journal) => (
              <li key={journal.id} className="flex flex-col items-center">
                <Link
                  to={`/journal/${journal.id}`}
                  className="group rounded-lg outline-offset-4 block
                    transition-transform duration-200 ease-spring hover:-translate-y-1.5"
                >
                  <JournalCover journal={journal} width={158} />
                  <span className="sr-only">
                    {journal.title}, {journal.pageIds.length} pages
                  </span>
                </Link>
              </li>
            ))}
            <li className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setNewJournal(true)}
                className="w-[158px] rounded-[4px_8px_8px_4px] border-2 border-dashed border-rule
                  grid place-items-center text-ink-faint hover:text-terracotta-deep
                  hover:border-terracotta-deep/50 transition-colors"
                style={{ height: Math.round(158 * 1.38) }}
              >
                <span className="flex flex-col items-center gap-2">
                  <Icon name="plus" size={26} />
                  <span className="text-sm font-medium">New journal</span>
                </span>
              </button>
            </li>
          </ul>
        )}
      </section>

      <NewJournalSheet open={newJournal} onClose={() => setNewJournal(false)} />
      <TodaySheet open={today} onClose={() => setToday(false)} />
      <QuickCaptureSheet open={quick} onClose={() => setQuick(false)} />
    </div>
  )
}

function RecentStrip({ pages }: { pages: Page[] }) {
  const navigate = useNavigate()
  const journals = useLibrary((s) => s.journals)

  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="font-display text-xl text-ink mb-3">Recent pages</h2>
      <ul className="flex gap-3.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2">
        {pages.map((page) => {
          const journal = journals.find((j) => j.id === page.journalId)
          const caption = page.title || summarise(page)
          return (
            <li key={page.id} className="shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/page/${page.id}`)}
                className="block w-[104px] text-left group"
              >
                <PagePreview
                  page={page}
                  label={`Page from ${formatRelative(page.date)}`}
                  className="rounded-lg border border-rule shadow-paper
                    group-hover:shadow-lift transition-shadow duration-200"
                />
                <p className="text-xs font-medium text-ink mt-1.5 truncate">{formatRelative(page.date)}</p>
                <p className="text-[11px] text-ink-faint truncate">{journal?.title ?? caption}</p>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function summarise(page: Page): string {
  const first = page.elements.find((el) => el.type === 'text' || el.type === 'note')
  return first ? describeElement(first) : 'Untitled'
}
