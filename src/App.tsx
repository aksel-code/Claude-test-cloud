import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSettings, watchSystemTheme } from './store/settings'
import { useLibrary } from './store/library'
import { ToastHost } from './components/ui/Toast'
import { AppNav } from './components/AppNav'
import { LockGate } from './components/lock/LockGate'
import { LibraryScreen } from './components/library/LibraryScreen'
import { JournalScreen } from './components/library/JournalScreen'
import { seedIfNeeded } from './lib/seed'
import { requestPersistence } from './lib/db'

// Heavy routes are split out: Konva and jsPDF together are most of the bundle,
// and the library shouldn't pay for them.
const EditorScreen = lazy(() => import('./components/editor/EditorScreen'))
const ReaderScreen = lazy(() => import('./components/read/ReaderScreen'))
const CalendarScreen = lazy(() => import('./components/browse/CalendarScreen'))
const MoodsScreen = lazy(() => import('./components/browse/MoodsScreen'))
const SearchScreen = lazy(() => import('./components/browse/SearchScreen'))
const SettingsScreen = lazy(() => import('./components/SettingsScreen'))

function Loading() {
  return (
    <div className="min-h-[60vh] grid place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-ink-faint">
        <span className="w-8 h-8 rounded-full border-2 border-rule border-t-terracotta animate-spin" />
        <span className="text-sm">Opening…</span>
      </div>
    </div>
  )
}

export default function App() {
  const hydrate = useSettings((s) => s.hydrate)
  const hydrated = useSettings((s) => s.hydrated)
  const refresh = useLibrary((s) => s.refresh)
  const [ready, setReady] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await hydrate()
      await seedIfNeeded()
      await refresh()
      // Best-effort: ask the browser not to evict a journal under disk pressure.
      void requestPersistence()
      if (!cancelled) setReady(true)
    })()
    return () => { cancelled = true }
  }, [hydrate, refresh])

  useEffect(() => watchSystemTheme(), [])

  // The editor is full-bleed: the canvas is the hero, so the app chrome steps aside.
  const immersive = location.pathname.startsWith('/page/') || location.pathname.startsWith('/read/')

  if (!ready || !hydrated) {
    return (
      <div className="min-h-dvh grid place-items-center bg-page">
        <div className="text-center animate-fade-up">
          <h1 className="font-display text-3xl text-ink">Pagebound</h1>
          <p className="text-ink-faint text-sm mt-1">Getting your pages…</p>
        </div>
      </div>
    )
  }

  return (
    <LockGate>
      <a href="#main" className="sr-only-focusable absolute z-[70] m-3 btn-primary">
        Skip to content
      </a>

      <div className={immersive ? 'min-h-dvh bg-page' : 'min-h-dvh bg-page md:flex'}>
        {!immersive && <AppNav />}

        <main
          id="main"
          className={immersive ? '' : 'flex-1 min-w-0 pb-24 md:pb-0 md:pl-0'}
          tabIndex={-1}
        >
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<LibraryScreen />} />
              <Route path="/journal/:journalId" element={<JournalScreen />} />
              <Route path="/page/:pageId" element={<EditorScreen />} />
              <Route path="/read/:journalId" element={<ReaderScreen />} />
              <Route path="/calendar" element={<CalendarScreen />} />
              <Route path="/moods" element={<MoodsScreen />} />
              <Route path="/search" element={<SearchScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <ToastHost />
    </LockGate>
  )
}
