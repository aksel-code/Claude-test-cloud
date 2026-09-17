/**
 * All dates in Pagebound are *local* calendar days serialised as `YYYY-MM-DD`.
 * We deliberately never round-trip through UTC: a page written at 11pm belongs
 * to that evening, not to tomorrow in London.
 */

export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(key: string, delta: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + delta)
  return toDateKey(d)
}

/** Whole days between two keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = fromDateKey(a)
  const db = fromDateKey(b)
  da.setHours(12, 0, 0, 0)
  db.setHours(12, 0, 0, 0)
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function weekdayName(key: string): string {
  return WEEKDAYS[fromDateKey(key).getDay()]
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex]
}

/** "14 March 2025" */
export function formatLong(key: string): string {
  const d = fromDateKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "14 Mar" */
export function formatShort(key: string): string {
  const d = fromDateKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

/** "Today", "Yesterday", "Tuesday", else "14 Mar 2025". */
export function formatRelative(key: string, now = todayKey()): string {
  const diff = daysBetween(key, now)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return weekdayName(key)
  if (diff === -1) return 'Tomorrow'
  const d = fromDateKey(key)
  const sameYear = d.getFullYear() === fromDateKey(now).getFullYear()
  return sameYear ? formatShort(key) : formatLong(key)
}

/** Days in a month, 0-indexed month. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Calendar grid for a month, padded to whole weeks.
 * `weekStart` 0 = Sunday, 1 = Monday.
 */
export function monthGrid(year: number, month: number, weekStart = 1): (string | null)[] {
  const first = new Date(year, month, 1).getDay()
  const lead = (first - weekStart + 7) % 7
  const total = daysInMonth(year, month)
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= total; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** `MM-DD` — the key "on this day" matches across years. */
export function monthDayKey(key: string): string {
  return key.slice(5)
}

export function yearOf(key: string): number {
  return Number(key.slice(0, 4))
}

/** "3 years ago", "8 months ago". Coarse on purpose — this is a memory, not a log. */
export function describeGap(fromKey: string, now = todayKey()): string {
  const days = daysBetween(fromKey, now)
  const years = Math.round(days / 365)
  if (years >= 1) return years === 1 ? 'a year ago' : `${years} years ago`
  const months = Math.max(1, Math.round(days / 30))
  return months === 1 ? 'a month ago' : `${months} months ago`
}
