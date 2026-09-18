/**
 * On-device "smart defaults" — no AI, no network, no backend.
 *
 * Tracks how often each sticker/tape/note/shape gets placed, purely on this
 * device, and uses that to promote what someone actually reaches for to the
 * front of a picker. This is the mechanism behind the "Recent" strip in
 * StickerPicker and the reordering in TapePicker/NotePicker/ShapePicker: the
 * mobile toolbar itself stays in its original fixed order on purpose (see the
 * comment in Toolbar.tsx — a stable order is what makes it a muscle-memory
 * target), but the content pickers underneath it have dozens of items each,
 * where "show me the ones I actually use" is a real win.
 *
 * State lives in localStorage rather than the IndexedDB-backed settings
 * store: it's a convenience ranking, not data anyone would want backed up or
 * migrated, and localStorage keeps this synchronous and dependency-free.
 */

interface UsageEntry {
  count: number
  last: number
}

const LS_KEY = 'pagebound.usage'
const MAX_TRACKED = 200

let cache: Record<string, UsageEntry> | null = null

function load(): Record<string, UsageEntry> {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(LS_KEY)
    cache = raw ? (JSON.parse(raw) as Record<string, UsageEntry>) : {}
  } catch {
    cache = {}
  }
  return cache
}

function persist() {
  try {
    if (cache) localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* private mode, or quota exceeded — the ranking just resets */
  }
}

/** Call when the user places/picks something, e.g. `recordUsage('sticker:nature:leaf')`. */
export function recordUsage(key: string): void {
  const state = load()
  const existing = state[key]
  state[key] = { count: (existing?.count ?? 0) + 1, last: Date.now() }

  // Keep the table bounded: drop the least-recently-used entry once it grows
  // past a cap, rather than letting a long history of one-off taps pile up.
  const keys = Object.keys(state)
  if (keys.length > MAX_TRACKED) {
    const oldest = keys.reduce((a, b) => (state[a].last < state[b].last ? a : b))
    delete state[oldest]
  }

  persist()
}

/** A recency-and-frequency score, highest first. Purely local, purely additive. */
function score(entry: UsageEntry | undefined): number {
  if (!entry) return -Infinity
  const ageDays = (Date.now() - entry.last) / 86_400_000
  // Frequency dominates, but a stale favourite still fades relative to a
  // recent one — halves in influence roughly every two weeks.
  return entry.count * Math.pow(0.5, ageDays / 14)
}

/** Stable-sorts `items` so the most used (by `keyOf`) come first. */
export function rankByUsage<T>(items: T[], keyOf: (item: T) => string): T[] {
  const state = load()
  return items
    .map((item, index) => ({ item, index, s: score(state[keyOf(item)]) }))
    .sort((a, b) => (b.s !== a.s ? b.s - a.s : a.index - b.index))
    .map((entry) => entry.item)
}

/** The `limit` highest-scoring keys matching `prefix`, most used first. */
export function topUsageKeys(prefix: string, limit: number): string[] {
  const state = load()
  return Object.keys(state)
    .filter((key) => key.startsWith(prefix))
    .filter((key) => score(state[key]) > 0)
    .sort((a, b) => score(state[b]) - score(state[a]))
    .slice(0, limit)
}
