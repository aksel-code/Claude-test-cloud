import { useSettings } from '@/store/settings'
import { Icon } from '../ui/Icon'
import { todayKey } from '@/lib/date'

/**
 * Streak display.
 *
 * The brief was "subtle, never guilt-inducing", so: it only appears once a
 * streak actually exists, it never shows a zero, it never shows a broken
 * streak, and there is no "don't lose it!" language anywhere. A day off is
 * simply a day off.
 */
export function StreakChip() {
  const streak = useSettings((s) => s.streak)
  const lastEntry = useSettings((s) => s.lastEntryDate)
  if (streak < 2) return null

  const wroteToday = lastEntry === todayKey()

  return (
    <span
      className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full
        bg-mustard/20 text-mustard-deep text-sm font-medium"
      title={wroteToday
        ? `${streak} days in a row, including today`
        : `${streak} days in a row`}
    >
      <Icon name="flame" size={16} />
      <span className="tabular-nums">{streak}</span>
      <span className="text-ink-soft font-normal">day{streak === 1 ? '' : 's'}</span>
    </span>
  )
}
