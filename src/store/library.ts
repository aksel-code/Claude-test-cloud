import { create } from 'zustand'
import {
  deleteJournal, deletePage, getJournals, getPagesForJournal, getRecentPages,
  getPagesOnDate, putJournal, putPage, getAllPages,
} from '@/lib/db'
import { uid } from '@/lib/id'
import { todayKey } from '@/lib/date'
import { DEFAULT_BACKGROUND } from '@/content/papers'
import { DEFAULT_COVER_COLOR } from '@/content/covers'
import type { CoverStyle, Journal, Page, PageElement } from '@/lib/types'

interface LibraryState {
  journals: Journal[]
  recent: Page[]
  loading: boolean
  loaded: boolean

  refresh: () => Promise<void>
  createJournal: (init: Partial<Pick<Journal, 'title' | 'coverStyle' | 'color' | 'coverImage'>>) => Promise<Journal>
  updateJournal: (id: string, patch: Partial<Journal>) => Promise<void>
  removeJournal: (id: string) => Promise<void>

  createPage: (journalId: string, init?: Partial<Pick<Page, 'date' | 'title' | 'elements' | 'mood' | 'tags' | 'background'>>) => Promise<Page>
  removePage: (id: string) => Promise<void>
}

export const useLibrary = create<LibraryState>((set, get) => ({
  journals: [],
  recent: [],
  loading: false,
  loaded: false,

  refresh: async () => {
    set({ loading: true })
    const [journals, recent] = await Promise.all([getJournals(), getRecentPages(14)])
    set({ journals, recent, loading: false, loaded: true })
  },

  createJournal: async (init) => {
    const now = Date.now()
    const journal: Journal = {
      id: uid('j_'),
      title: init.title?.trim() || 'Untitled journal',
      coverStyle: (init.coverStyle ?? 'fabric') as CoverStyle,
      color: init.color ?? DEFAULT_COVER_COLOR,
      coverImage: init.coverImage ?? null,
      createdAt: now,
      updatedAt: now,
      pageIds: [],
      archived: false,
    }
    await putJournal(journal)
    set({ journals: [journal, ...get().journals] })
    return journal
  },

  updateJournal: async (id, patch) => {
    const current = get().journals.find((j) => j.id === id)
    if (!current) return
    const next = { ...current, ...patch, updatedAt: Date.now() }
    await putJournal(next)
    set({ journals: get().journals.map((j) => (j.id === id ? next : j)) })
  },

  removeJournal: async (id) => {
    await deleteJournal(id)
    set({
      journals: get().journals.filter((j) => j.id !== id),
      recent: get().recent.filter((p) => p.journalId !== id),
    })
  },

  createPage: async (journalId, init = {}) => {
    const now = Date.now()
    const page: Page = {
      id: uid('p_'),
      journalId,
      date: init.date ?? todayKey(),
      title: init.title ?? '',
      background: init.background ?? DEFAULT_BACKGROUND,
      mood: init.mood ?? null,
      tags: init.tags ?? [],
      elements: (init.elements ?? []) as PageElement[],
      createdAt: now,
      updatedAt: now,
    }
    await putPage(page)

    const journal = get().journals.find((j) => j.id === journalId)
    if (journal) {
      const next = {
        ...journal,
        pageIds: [...journal.pageIds, page.id],
        updatedAt: now,
      }
      await putJournal(next)
      set({ journals: get().journals.map((j) => (j.id === journalId ? next : j)) })
    }

    set({ recent: [page, ...get().recent].slice(0, 14) })
    return page
  },

  removePage: async (id) => {
    await deletePage(id)
    set({ recent: get().recent.filter((p) => p.id !== id) })
    await get().refresh()
  },
}))

/* --------------------------------------------------------------- queries */

export async function pagesForJournal(journalId: string): Promise<Page[]> {
  return getPagesForJournal(journalId)
}

export async function pagesOnDate(dateKey: string): Promise<Page[]> {
  return getPagesOnDate(dateKey)
}

export interface SearchHit {
  page: Page
  journal: Journal | undefined
  /** Why this page matched, for the result snippet. */
  reason: 'text' | 'tag' | 'title' | 'journal'
  snippet: string
}

/**
 * Search across page text, notes, titles, tags and journal names.
 *
 * Everything lives on-device and page counts are in the hundreds, not millions,
 * so a linear scan is genuinely the right tool — an index would be more code,
 * more to keep in sync, and no faster at this size.
 */
export async function searchPages(query: string, journalFilter?: string): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const [pages, journals] = await Promise.all([getAllPages(), getJournals()])
  const journalById = new Map(journals.map((j) => [j.id, j]))
  const hits: SearchHit[] = []

  for (const page of pages) {
    if (journalFilter && page.journalId !== journalFilter) continue
    const journal = journalById.get(page.journalId)

    if (page.title.toLowerCase().includes(q)) {
      hits.push({ page, journal, reason: 'title', snippet: page.title })
      continue
    }

    const tag = page.tags.find((t) => t.toLowerCase().includes(q))
    if (tag) {
      hits.push({ page, journal, reason: 'tag', snippet: `#${tag}` })
      continue
    }

    let matched = false
    for (const el of page.elements) {
      const text = el.type === 'text' ? el.props.text
        : el.type === 'note' ? el.props.text
        : el.type === 'photo' ? `${el.props.caption} ${el.props.alt}`
        : ''
      const lower = text.toLowerCase()
      const at = lower.indexOf(q)
      if (at >= 0) {
        const start = Math.max(0, at - 30)
        hits.push({
          page,
          journal,
          reason: 'text',
          snippet: `${start > 0 ? '…' : ''}${text.slice(start, at + q.length + 40).trim()}${
            at + q.length + 40 < text.length ? '…' : ''}`,
        })
        matched = true
        break
      }
    }
    if (matched) continue

    if (journal?.title.toLowerCase().includes(q)) {
      hits.push({ page, journal, reason: 'journal', snippet: journal.title })
    }
  }

  return hits
}

/** Every tag in use, most-used first. */
export async function allTags(): Promise<{ tag: string; count: number }[]> {
  const pages = await getAllPages()
  const counts = new Map<string, number>()
  for (const page of pages) {
    for (const tag of page.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
