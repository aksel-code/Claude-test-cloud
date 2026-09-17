import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Asset, Journal, LockConfig, Page, PageThumb, Settings,
} from './types'

/**
 * Everything Pagebound knows lives in this one IndexedDB database, on the
 * user's device. There is no server, no sync and no telemetry — see
 * `src/components/SettingsScreen.tsx` for the copy that explains this in-app.
 *
 * Photos are stored as Blobs in their own store so that reading a Page record
 * (which happens constantly) never drags megabytes of image data with it.
 */

const DB_NAME = 'pagebound'
const DB_VERSION = 1

interface PageboundSchema extends DBSchema {
  journals: {
    key: string
    value: Journal
    indexes: { 'by-updated': number }
  }
  pages: {
    key: string
    value: Page
    indexes: { 'by-journal': string; 'by-date': string; 'by-updated': number }
  }
  assets: {
    key: string
    value: Asset
  }
  thumbs: {
    key: string
    value: PageThumb
    indexes: { 'by-journal': string }
  }
  meta: {
    key: string
    value: unknown
  }
}

let dbPromise: Promise<IDBPDatabase<PageboundSchema>> | null = null

export function db(): Promise<IDBPDatabase<PageboundSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PageboundSchema>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        // v1 — initial schema. Future migrations append `if (oldVersion < n)`
        // blocks here; never mutate an earlier block.
        if (oldVersion < 1) {
          const journals = database.createObjectStore('journals', { keyPath: 'id' })
          journals.createIndex('by-updated', 'updatedAt')

          const pages = database.createObjectStore('pages', { keyPath: 'id' })
          pages.createIndex('by-journal', 'journalId')
          pages.createIndex('by-date', 'date')
          pages.createIndex('by-updated', 'updatedAt')

          database.createObjectStore('assets', { keyPath: 'id' })

          const thumbs = database.createObjectStore('thumbs', { keyPath: 'pageId' })
          thumbs.createIndex('by-journal', 'journalId')

          database.createObjectStore('meta')
        }
      },
      blocked() {
        console.warn('[pagebound] Another tab is holding an older database version open.')
      },
    })
  }
  return dbPromise
}

/* ---------------------------------------------------------------- journals */

export async function getJournals(): Promise<Journal[]> {
  const all = await (await db()).getAll('journals')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getJournal(id: string): Promise<Journal | undefined> {
  return (await db()).get('journals', id)
}

export async function putJournal(journal: Journal): Promise<void> {
  await (await db()).put('journals', journal)
}

/** Deletes the journal, its pages, their thumbnails and any orphaned photos. */
export async function deleteJournal(id: string): Promise<void> {
  const database = await db()
  const pages = await database.getAllFromIndex('pages', 'by-journal', id)
  const assetIds = new Set<string>()
  for (const page of pages) {
    for (const el of page.elements) {
      if (el.type === 'photo') assetIds.add(el.props.assetId)
    }
  }
  const journal = await database.get('journals', id)
  if (journal?.coverImage) assetIds.add(journal.coverImage)

  const tx = database.transaction(['journals', 'pages', 'thumbs'], 'readwrite')
  await Promise.all([
    tx.objectStore('journals').delete(id),
    ...pages.map((p) => tx.objectStore('pages').delete(p.id)),
    ...pages.map((p) => tx.objectStore('thumbs').delete(p.id)),
    tx.done,
  ])
  await releaseAssets([...assetIds])
}

/* ------------------------------------------------------------------- pages */

export async function getPage(id: string): Promise<Page | undefined> {
  return (await db()).get('pages', id)
}

export async function getPagesForJournal(journalId: string): Promise<Page[]> {
  const pages = await (await db()).getAllFromIndex('pages', 'by-journal', journalId)
  return pages.sort(comparePages)
}

export async function getAllPages(): Promise<Page[]> {
  const pages = await (await db()).getAll('pages')
  return pages.sort(comparePages)
}

/** Newest-first by updatedAt — powers the "recent pages" strip. */
export async function getRecentPages(limit = 12): Promise<Page[]> {
  const database = await db()
  const out: Page[] = []
  let cursor = await database.transaction('pages').store.index('by-updated').openCursor(null, 'prev')
  while (cursor && out.length < limit) {
    out.push(cursor.value)
    cursor = await cursor.continue()
  }
  return out
}

export async function getPagesOnDate(dateKey: string): Promise<Page[]> {
  return (await db()).getAllFromIndex('pages', 'by-date', dateKey)
}

export async function putPage(page: Page): Promise<void> {
  await (await db()).put('pages', page)
}

export async function deletePage(id: string): Promise<void> {
  const database = await db()
  const page = await database.get('pages', id)
  if (!page) return

  const journal = await database.get('journals', page.journalId)
  const tx = database.transaction(['pages', 'thumbs', 'journals'], 'readwrite')
  const ops: Promise<unknown>[] = [
    tx.objectStore('pages').delete(id),
    tx.objectStore('thumbs').delete(id),
  ]
  if (journal) {
    ops.push(tx.objectStore('journals').put({
      ...journal,
      pageIds: journal.pageIds.filter((p) => p !== id),
      updatedAt: Date.now(),
    }))
  }
  await Promise.all([...ops, tx.done])

  const assetIds = page.elements.flatMap((el) => (el.type === 'photo' ? [el.props.assetId] : []))
  await releaseAssets(assetIds)
}

/** Sort: newest calendar day first, then newest edit. */
function comparePages(a: Page, b: Page): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return b.updatedAt - a.updatedAt
}

/* ------------------------------------------------------------------ assets */

export async function getAsset(id: string): Promise<Asset | undefined> {
  return (await db()).get('assets', id)
}

export async function putAsset(asset: Asset): Promise<void> {
  await (await db()).put('assets', asset)
}

/**
 * Drops each asset that no page element and no journal cover still references.
 * Cheap enough to run on delete: the scan is over page *records*, not blobs.
 */
export async function releaseAssets(candidates: string[]): Promise<void> {
  if (candidates.length === 0) return
  const database = await db()
  const [pages, journals] = await Promise.all([
    database.getAll('pages'),
    database.getAll('journals'),
  ])

  const live = new Set<string>()
  for (const page of pages) {
    for (const el of page.elements) {
      if (el.type === 'photo') live.add(el.props.assetId)
    }
  }
  for (const journal of journals) {
    if (journal.coverImage) live.add(journal.coverImage)
  }

  const orphans = candidates.filter((id) => !live.has(id))
  if (orphans.length === 0) return
  const tx = database.transaction('assets', 'readwrite')
  await Promise.all([...orphans.map((id) => tx.store.delete(id)), tx.done])
}

/* ------------------------------------------------------------------ thumbs */

export async function getThumb(pageId: string): Promise<PageThumb | undefined> {
  return (await db()).get('thumbs', pageId)
}

export async function putThumb(thumb: PageThumb): Promise<void> {
  await (await db()).put('thumbs', thumb)
}

export async function getThumbsForJournal(journalId: string): Promise<PageThumb[]> {
  return (await db()).getAllFromIndex('thumbs', 'by-journal', journalId)
}

/* -------------------------------------------------------------------- meta */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db()).get('meta', key) as Promise<T | undefined>
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', value, key)
}

export const SETTINGS_KEY = 'settings'
export const LOCK_KEY = 'lock'

export async function loadSettings(): Promise<Partial<Settings> | undefined> {
  return getMeta<Partial<Settings>>(SETTINGS_KEY)
}

export async function saveSettings(settings: Settings): Promise<void> {
  await setMeta(SETTINGS_KEY, settings)
}

export async function loadLock(): Promise<LockConfig | undefined> {
  return getMeta<LockConfig>(LOCK_KEY)
}

export async function saveLock(config: LockConfig): Promise<void> {
  await setMeta(LOCK_KEY, config)
}

/* ------------------------------------------------------------- housekeeping */

export interface StorageReport {
  journals: number
  pages: number
  photos: number
  photoBytes: number
  /** Browser's own estimate, when it will give us one. */
  quotaUsed: number | null
  quotaTotal: number | null
  persisted: boolean
}

export async function storageReport(): Promise<StorageReport> {
  const database = await db()
  const [journals, pages, assets] = await Promise.all([
    database.count('journals'),
    database.count('pages'),
    database.getAll('assets'),
  ])

  let quotaUsed: number | null = null
  let quotaTotal: number | null = null
  if (navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate()
      quotaUsed = est.usage ?? null
      quotaTotal = est.quota ?? null
    } catch { /* Safari private mode throws; the counts above still stand. */ }
  }

  let persisted = false
  if (navigator.storage?.persisted) {
    try { persisted = await navigator.storage.persisted() } catch { /* ignore */ }
  }

  return {
    journals,
    pages,
    photos: assets.length,
    photoBytes: assets.reduce((sum, a) => sum + a.bytes, 0),
    quotaUsed,
    quotaTotal,
    persisted,
  }
}

/**
 * Ask the browser not to evict us under storage pressure. Chrome grants this
 * silently for installed/engaged sites; Safari ignores it. Harmless either way.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try { return await navigator.storage.persist() } catch { return false }
}

/** Nukes everything. Used only by the explicit "delete all data" flow. */
export async function wipeAll(): Promise<void> {
  const database = await db()
  const tx = database.transaction(['journals', 'pages', 'assets', 'thumbs', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('journals').clear(),
    tx.objectStore('pages').clear(),
    tx.objectStore('assets').clear(),
    tx.objectStore('thumbs').clear(),
    tx.objectStore('meta').clear(),
    tx.done,
  ])
}
