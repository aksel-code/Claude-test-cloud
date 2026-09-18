import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync, useMediaQuery } from '@/hooks'
import { getAllPages } from '@/lib/db'
import { MOODS, getMood, moodChartColor } from '@/content/moods'
import { Icon } from '../ui/Icon'
import { Segmented, EmptyState } from '../ui/Controls'
import { ScreenHeader } from '../ui/ScreenHeader'
import { addDays, formatShort, formatLong, todayKey } from '@/lib/date'
import type { MoodId, Page } from '@/lib/types'

type Range = '30' | '90' | '365'

/**
 * Mood over time.
 *
 * Form: one row per mood, days along the x-axis, a dot where that day was that
 * mood. Position plus a permanent row label carries identity — colour only
 * reinforces it — which is what lets the chart keep the product's deliberately
 * muted palette. See `moodChartColor` for the full reasoning.
 *
 * Non-clinical by construction: no score, no average, no trend line, no target.
 * The question it answers is "what has this stretch felt like", not "am I
 * improving".
 */
export default function MoodsScreen() {
  const load = useCallback(() => getAllPages(), [])
  const { value: pages, loading } = useAsync<Page[]>(load, [], [])
  const [range, setRange] = useState<Range>('90')
  const [asTable, setAsTable] = useState(false)
  const [hover, setHover] = useState<{ date: string; mood: MoodId } | null>(null)
  const dark = useMediaQuery('(prefers-color-scheme: dark)')

  const today = todayKey()
  const days = Number(range)
  const start = addDays(today, -(days - 1))

  const entries = useMemo(() => {
    const map = new Map<string, MoodId>()
    for (const page of pages) {
      if (!page.mood) continue
      if (page.date < start || page.date > today) continue
      // One mood per day: the most recently edited page wins.
      map.set(page.date, page.mood)
    }
    return map
  }, [pages, start, today])

  const counts = useMemo(() => {
    const out = new Map<MoodId, number>()
    for (const mood of entries.values()) out.set(mood, (out.get(mood) ?? 0) + 1)
    return out
  }, [entries])

  const total = entries.size
  const dayList = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(start, i)),
    [start, days],
  )

  if (!loading && pages.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-10">
        <EmptyState
          icon="sparkle"
          title="No moods recorded yet"
          body="When you add a mood to a page, it shows up here. It is always optional."
          action={<Link to="/" className="btn-primary">Back to the library</Link>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
      <ScreenHeader
        eyebrow="PAGEBOUND — MOODS"
        title="Moods"
        subtitle={total > 0
          ? `${total} ${total === 1 ? 'day' : 'days'} recorded in the last ${days}.`
          : 'Nothing recorded in this stretch.'}
        meta={`${days}D WINDOW`}
      />

      {/* Controls sit in one row above the chart. */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Segmented<Range>
          label="Time range"
          value={range}
          onChange={setRange}
          options={[
            { value: '30', label: '30 days' },
            { value: '90', label: '3 months' },
            { value: '365', label: 'A year' },
          ]}
        />
        <button
          type="button"
          onClick={() => setAsTable(!asTable)}
          aria-pressed={asTable}
          className="btn-ghost ml-auto"
        >
          <Icon name={asTable ? 'grid' : 'align'} size={17} />
          {asTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {asTable ? (
        <MoodTable counts={counts} total={total} />
      ) : (
        <div className="card p-4 sm:p-5 overflow-hidden">
          <div className="overflow-x-auto thin-scroll">
            <div style={{ minWidth: Math.max(280, dayList.length * (days > 120 ? 4 : days > 60 ? 7 : 12)) }}>
              {MOODS.map((mood) => {
                const color = moodChartColor(mood, dark)
                const count = counts.get(mood.id) ?? 0
                return (
                  <div key={mood.id} className="flex items-center gap-3 py-1.5 group">
                    {/* Permanent direct label: identity is never colour alone. */}
                    <span className="w-20 sm:w-24 shrink-0 flex items-center gap-1.5 text-sm text-ink">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: color }}
                        aria-hidden="true"
                      />
                      {mood.label}
                    </span>

                    <div className="flex-1 flex items-center gap-[2px] h-6">
                      {dayList.map((day) => {
                        const on = entries.get(day) === mood.id
                        return (
                          <span
                            key={day}
                            onPointerEnter={() => on && setHover({ date: day, mood: mood.id })}
                            onPointerLeave={() => setHover(null)}
                            className="flex-1 h-full rounded-[2px] transition-colors duration-100"
                            style={{
                              background: on ? color : 'rgb(var(--pb-sunk))',
                              opacity: on ? 1 : 0.55,
                              minWidth: 2,
                            }}
                          />
                        )
                      })}
                    </div>

                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                      {count || ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between mt-2 text-xs text-ink-faint">
            <span>{formatShort(start)}</span>
            <span aria-live="polite" className="font-medium text-ink-soft">
              {hover ? `${formatLong(hover.date)} — ${getMood(hover.mood)?.label}` : ''}
            </span>
            <span>Today</span>
          </div>
        </div>
      )}

      {/* An accessible summary, because a strip of dots is not readable aloud. */}
      <p className="sr-only">
        {MOODS.map((mood) => `${mood.label}: ${counts.get(mood.id) ?? 0} days`).join('. ')}.
      </p>

      <p className="text-sm text-ink-soft mt-6 leading-relaxed">
        There is no score here, and no streak to protect. Some stretches are
        stormy and that is simply what they were.
      </p>

      <p className="mt-6">
        <Link to="/calendar" className="btn-ghost">
          <Icon name="calendar" size={18} />
          Back to the calendar
        </Link>
      </p>
    </div>
  )
}

function MoodTable({ counts, total }: { counts: Map<MoodId, number>; total: number }) {
  return (
    <table className="w-full card overflow-hidden text-sm">
      <caption className="sr-only">Days recorded for each mood</caption>
      <thead>
        <tr className="border-b border-rule">
          <th scope="col" className="text-left font-semibold px-4 py-2.5">Mood</th>
          <th scope="col" className="text-right font-semibold px-4 py-2.5">Days</th>
          <th scope="col" className="text-right font-semibold px-4 py-2.5">Share</th>
        </tr>
      </thead>
      <tbody>
        {MOODS.map((mood) => {
          const count = counts.get(mood.id) ?? 0
          return (
            <tr key={mood.id} className="border-b border-rule last:border-0">
              <th scope="row" className="text-left font-normal px-4 py-2.5 text-ink">
                {mood.label}
                <span className="text-ink-faint"> &mdash; {mood.blurb}</span>
              </th>
              <td className="text-right px-4 py-2.5 tabular-nums text-ink">{count}</td>
              <td className="text-right px-4 py-2.5 tabular-nums text-ink-soft">
                {total ? `${Math.round((count / total) * 100)}%` : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
