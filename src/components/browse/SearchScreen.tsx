import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { allTags, searchPages, type SearchHit } from '@/store/library'
import { useLibrary } from '@/store/library'
import { useAsync, useDebounced } from '@/hooks'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/Controls'
import { ScreenHeader } from '../ui/ScreenHeader'
import { PagePreview } from '../library/PagePreview'
import { formatRelative } from '@/lib/date'
import { prefersReducedMotion } from '@/lib/motion'

export default function SearchScreen() {
  const journals = useLibrary((s) => s.journals)
  const [query, setQuery] = useState('')
  const [journalFilter, setJournalFilter] = useState<string>('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const debounced = useDebounced(query, 200)
  const loadTags = useCallback(() => allTags(), [])
  const { value: tags } = useAsync<{ tag: string; count: number }[]>(loadTags, [], [])

  useEffect(() => { input.current?.focus() }, [])

  useEffect(() => {
    let live = true
    if (!debounced.trim()) { setHits([]); return }
    setSearching(true)
    void searchPages(debounced, journalFilter || undefined).then((results) => {
      if (!live) return
      setHits(results)
      setSearching(false)
    })
    return () => { live = false }
  }, [debounced, journalFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, SearchHit[]>()
    for (const hit of hits) {
      const key = hit.journal?.title ?? 'Other'
      const list = map.get(key)
      if (list) list.push(hit)
      else map.set(key, [hit])
    }
    return [...map.entries()]
  }, [hits])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
      <ScreenHeader eyebrow="PAGEBOUND — SEARCH" title="Search" />

      <div className="relative mb-3">
        <Icon name="search" size={19} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          ref={input}
          type="search"
          className="field pl-11 text-base"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Words, captions, tags, journals…"
          aria-label="Search your journals"
          autoComplete="off"
        />
      </div>

      {journals.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-4">
          <FilterChip active={!journalFilter} onClick={() => setJournalFilter('')}>All journals</FilterChip>
          {journals.map((journal) => (
            <FilterChip
              key={journal.id}
              active={journalFilter === journal.id}
              onClick={() => setJournalFilter(journal.id)}
            >
              {journal.title}
            </FilterChip>
          ))}
        </div>
      )}

      {!query.trim() && tags.length > 0 && (
        <section aria-labelledby="tags-heading" className="mt-6">
          <h2 id="tags-heading" className="font-display text-lg text-ink mb-2.5">Your tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-full
                  border border-rule text-sm text-ink-soft hover:text-ink hover:border-ink-faint
                  transition-colors"
              >
                <Icon name="tag" size={14} />
                {tag}
                <span className="text-xs tabular-nums text-ink-faint">{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {query.trim() && (
        <div aria-live="polite" aria-busy={searching}>
          {hits.length === 0 && !searching ? (
            <EmptyState
              icon="search"
              title={`Nothing for “${query}”`}
              body="Search looks through your writing, photo captions, alt text, page titles and tags."
            />
          ) : (
            <>
              <p className="text-sm text-ink-soft mb-4">
                {hits.length} {hits.length === 1 ? 'page' : 'pages'}
              </p>
              {grouped.map(([journalTitle, journalHits]) => (
                <section key={journalTitle} className="mb-7">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-2.5">
                    {journalTitle}
                  </h2>
                  <ul className="space-y-2.5">
                    <AnimatePresence initial={!prefersReducedMotion()}>
                      {journalHits.map((hit, index) => (
                        <motion.li
                          key={hit.page.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.24, delay: Math.min(index, 6) * 0.03, ease: [0.2, 0.8, 0.3, 1] }}
                        >
                          <Link
                            to={`/page/${hit.page.id}`}
                            className="flex gap-3.5 p-2.5 rounded-xl border border-rule bg-surface
                              hover:shadow-paper hover:border-ink-faint transition-all"
                          >
                            <PagePreview
                              page={hit.page}
                              className="w-14 shrink-0 rounded-md border border-rule"
                            />
                            <div className="min-w-0 flex-1 py-0.5">
                              <p className="text-sm font-medium text-ink truncate">
                                {hit.page.title || formatRelative(hit.page.date)}
                              </p>
                              <p className="text-sm text-ink-soft line-clamp-2 mt-0.5 leading-snug">
                                <Highlight text={hit.snippet} query={query} />
                              </p>
                              <p className="text-xs text-ink-faint mt-1">
                                {formatRelative(hit.page.date)}
                                {hit.page.tags.length > 0 && <> &middot; #{hit.page.tags.join(' #')}</>}
                              </p>
                            </div>
                          </Link>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap shrink-0 px-3.5 rounded-full text-sm font-medium transition-colors
        ${active ? 'bg-ink text-page' : 'bg-sunk text-ink-soft hover:text-ink'}`}
    >
      {children}
    </button>
  )
}

/** Marks the matched run so the reason a result matched is visible, not guessed. */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = text.toLowerCase().indexOf(query.trim().toLowerCase())
  if (at < 0) return <>{text}</>
  const end = at + query.trim().length
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-mustard/40 text-ink rounded-[2px] px-0.5">{text.slice(at, end)}</mark>
      {text.slice(end)}
    </>
  )
}
