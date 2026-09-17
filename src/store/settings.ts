import { create } from 'zustand'
import { loadSettings, saveSettings } from '@/lib/db'
import { setHapticsEnabled, setMotionOverride } from '@/lib/motion'
import { addDays, todayKey } from '@/lib/date'
import type { Settings, ThemeSetting } from '@/lib/types'

const THEME_LS_KEY = 'pagebound.theme'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  snapEnabled: true,
  showSnapGuides: true,
  reduceMotion: null,
  hapticsEnabled: true,
  weatherEnabled: false,
  promptsEnabled: true,
  lastPromptIndex: 0,
  lastEntryDate: null,
  streak: 0,
  bestStreak: 0,
  seedVersion: 0,
  onboarded: false,
}

interface SettingsState extends Settings {
  hydrated: boolean
  hydrate: () => Promise<void>
  patch: (partial: Partial<Settings>) => void
  /** Records that an entry happened today and advances the streak. */
  recordEntry: (dateKey: string) => void
  nextPrompt: () => void
}

/** Writes are debounced: toggling a switch shouldn't hit IndexedDB per keystroke. */
let flushTimer: ReturnType<typeof setTimeout> | null = null
function scheduleFlush(get: () => SettingsState) {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    const s = get()
    const { hydrated: _h, hydrate: _hy, patch: _p, recordEntry: _r, nextPrompt: _n, ...plain } = s
    void saveSettings(plain)
  }, 180)
}

export function resolveTheme(theme: ThemeSetting): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function applyTheme(theme: ThemeSetting): void {
  const resolved = resolveTheme(theme)
  document.documentElement.dataset.theme = resolved
  // Mirrored to localStorage purely so index.html can avoid a flash of the
  // wrong theme before React (and IndexedDB) are ready.
  try { localStorage.setItem(THEME_LS_KEY, theme) } catch { /* private mode */ }
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const stored = await loadSettings()
    const merged = { ...DEFAULT_SETTINGS, ...stored }

    // A streak survives a gap of at most one day. Anything longer and it
    // quietly resets — no warning, no "you broke your streak" scolding.
    if (merged.lastEntryDate) {
      const today = todayKey()
      if (merged.lastEntryDate !== today && merged.lastEntryDate !== addDays(today, -1)) {
        merged.streak = 0
      }
    }

    set({ ...merged, hydrated: true })
    applyTheme(merged.theme)
    setMotionOverride(merged.reduceMotion)
    setHapticsEnabled(merged.hapticsEnabled)
  },

  patch: (partial) => {
    set(partial as Partial<SettingsState>)
    if (partial.theme) applyTheme(partial.theme)
    if ('reduceMotion' in partial) setMotionOverride(partial.reduceMotion ?? null)
    if ('hapticsEnabled' in partial) setHapticsEnabled(partial.hapticsEnabled ?? true)
    scheduleFlush(get)
  },

  recordEntry: (dateKey) => {
    const { lastEntryDate, streak, bestStreak } = get()
    if (lastEntryDate === dateKey) return

    // Only *today's* entry can extend a streak; back-filling an old page is a
    // lovely thing to do but it isn't a consecutive day of journalling.
    const today = todayKey()
    if (dateKey !== today) return

    const continued = lastEntryDate === addDays(today, -1)
    const next = continued ? streak + 1 : 1
    set({
      lastEntryDate: today,
      streak: next,
      bestStreak: Math.max(bestStreak, next),
    })
    scheduleFlush(get)
  },

  nextPrompt: () => {
    set({ lastPromptIndex: get().lastPromptIndex + 1 })
    scheduleFlush(get)
  },
}))

/** Keep the DOM in sync when the OS theme flips while we're on "system". */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!mq) return () => {}
  const handler = () => {
    if (useSettings.getState().theme === 'system') applyTheme('system')
  }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
