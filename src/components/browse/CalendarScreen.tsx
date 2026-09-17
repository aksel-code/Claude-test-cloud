import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { getAllPages } from '@/lib/db'
import { useLibrary } from '@/store/library'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/Controls'
import { PagePreview } from '../library/PagePreview'
import {
  describeGap, formatLong, formatRelative, monthDayKey, monthGrid, monthName, todayKey, yearOf,
} from '@/lib/date'
import { getMood } from '@/content/moods'
import type { Page } from '@/lib/types'

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function CalendarScreen() {
  const navigate = useNavigate()
  const journals = useLibrary((s) => s.journals)
  const load = useCallback(() => getAllPages(), [])
  const { value: pages, loading } = useAsync<Page[]>(load, [], [])

  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const byDate = useMemo(() => {
    const map = new Map<string, Page[]>()
    for (const page of pages) {
      const list = map.get(page.date)
      if (list) list.push(page)
      else map.set(page.date, [page])
    }
    return map
  }, [pages])

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month, 1), [cursor])

  // "On this day": same month-and-day, any earlier year.
  const memories = useMemo(() => {
    const key = monthDayKey(today)
    return pages
      .filter((page) => monthDayKey(page.date) === key && yearOf(page.date) < yearOf(today))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [pages, today])

  function shift(delta: number) {
    setCursor((current) => {
      const month = current.month + delta
      return {
        year: current.year + Math.floor(month / 12),
        month: ((month % 12) + 12) % 12,
      }
    })
  }

  const monthLabel = `${monthName(cursor.month)} ${cursor.year}`

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
      <h1 className="font-display text-3xl text-ink mb-1">Calendar</h1>
      <p className="text-ink-soft mb-7">Every day you wrote something.</p>

      {memories.length > 0 && <OnThisDay pages={memories} />}

      <section aria-labelledby="month-heading" className="card p-3 sm:p-5">
        <header className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => shift(-1)} className="tap rounded-lg text-ink-soft hover:text-ink hover:bg-sunk">
            <Icon name="chevronLeft" size={20} title="Previous month" />
          </button>
          <h2 id="month-heading" className="font-display text-xl text-ink" aria-live="polite">{monthLabel}</h2>
          <button type="button" onClick={() => shift(1)} className="tap rounded-lg text-ink-soft hover:text-ink hover:bg-sunk">
            <Icon name="chevronRight" size={20} title="Next month" />
          </button>
        </header>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5" aria-hidden="true">
          {WEEKDAY_INITIALS.map((initial, i) => (
            <span key={i} className="text-center text-xs font-semibold text-ink-faint py-1">{initial}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label={monthLabel}>
          {grid.map((dateKey, index) => {
            if (!dateKey) return <span key={`pad-${index}`} role="gridcell" aria-hidden="true" />
            const dayPages = byDate.get(dateKey) ?? []
            const day = Number(dateKey.slice(8))
            const isToday = dateKey === today
            const mood = getMood(dayPages.find((p) => p.mood)?.mood)

            if (dayPages.length === 0) {
              return (
                <span
                  key={dateKey}
                  role="gridcell"
                  className={`aspect-square rounded-lg grid place-items-center text-sm
                    ${isToday ? 'ring-2 ring-terracotta-deep text-ink font-semibold' : 'text-ink-faint'}`}
                >
                  {day}
                </span>
              )
            }

            return (
              <button
                key={dateKey}
                role="gridcell"
                type="button"
                onClick={() => navigate(`/page/${dayPages[0].id}`)}
                aria-label={`${formatLong(dateKey)}, ${dayPages.length} ${dayPages.length === 1 ? 'page' : 'pages'}${mood ? `, mood ${mood.label}` : ''}`}
                className={`relative aspect-square rounded-lg overflow-hidden group
                  transition-transform duration-150 ease-spring hover:scale-105 hover:z-10
                  ${isToday ? 'ring-2 ring-terracotta-deep' : 'ring-1 ring-rule'}`}
              >
                <PagePreview page={dayPages[0]} fit="fill" />
                <span className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                <span className="absolute bottom-0.5 left-1 text-[11px] font-semibold text-white drop-shadow">
                  {day}
                </span>
                {mood && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full ring-1 ring-white/70"
                    style={{ background: mood.color }}
                  />
                )}
                {dayPages.length > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-semibold text-white/90">
                    {dayPages.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {!loading && pages.length === 0 && (
        <EmptyState
          icon="calendar"
          title="Nothing here yet"
          body="Once you write a page, it will show up on the day you wrote it."
          action={<Link to="/" className="btn-primary">Back to the library</Link>}
        />
      )}

      {journals.length > 0 && (
        <p className="text-center mt-8">
          <Link to="/moods" className="btn-ghost">
            <Icon name="sparkle" size={18} />
            See moods over time
          </Link>
        </p>
      )}
    </div>
  )
}

function OnThisDay({ pages }: { pages: Page[] }) {
  const journals = useLibrary((s) => s.journals)

  return (
    <section aria-labelledby="memories-heading" className="mb-8">
      <h2 id="memories-heading" className="font-display text-xl text-ink mb-1">On this day</h2>
      <p className="text-sm text-ink-soft mb-3">
        {pages.length === 1 ? 'One page' : `${pages.length} pages`} from the same date in another year.
      </p>
      <ul className="flex gap-3.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2">
        {pages.map((page) => (
          <li key={page.id} className="shrink-0">
            <Link to={`/page/${page.id}`} className="block w-[124px] group">
              <PagePreview
                page={page}
                label={`Page from ${formatRelative(page.date)}`}
                className="rounded-lg border border-rule shadow-paper
                  group-hover:shadow-lift transition-shadow"
              />
              <p className="text-xs font-medium text-ink mt-1.5 truncate">{describeGap(page.date)}</p>
              <p className="text-[11px] text-ink-faint truncate">
                {journals.find((j) => j.id === page.journalId)?.title ?? ''}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
