import { useCallback, useEffect, useRef, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

/** True on viewports where the side toolbar and multi-column layouts make sense. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 900px)')
}

/**
 * Traps Tab within `ref` while `active`, restoring focus to whatever was
 * focused before on teardown. Every dialog and sheet in the app uses this.
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return
    const container = ref.current
    const previous = document.activeElement as HTMLElement | null

    const focusable = () =>
      [...container.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.offsetParent !== null || el === document.activeElement)

    const first = focusable()[0]
    ;(first ?? container).focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const start = items[0]
      const end = items[items.length - 1]
      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault()
        end.focus()
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault()
        start.focus()
      }
    }

    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      previous?.focus?.({ preventScroll: true })
    }
  }, [ref, active])
}

export function useEscape(handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        handler()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handler, active])
}

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const onDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler()
    }
    // Deferred so the click that opened the thing doesn't immediately close it.
    const id = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [ref, handler, active])
}

/** Stops body scroll behind an open overlay without the iOS jump. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const { overflow, paddingRight } = document.body.style
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [active])
}

/**
 * Element size via ResizeObserver.
 *
 * Returns a *callback* ref rather than a RefObject on purpose. A plain ref plus
 * a `[]` effect silently fails whenever the measured element isn't in the tree
 * on first render — which is exactly what happens behind a loading guard, and
 * the symptom is a component that measures 0x0 forever.
 */
export function useElementSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const ref = useCallback((next: T | null) => setNode(next), [])

  useEffect(() => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      setSize({ width: box.width, height: box.height })
    })
    observer.observe(node)
    setSize({ width: node.clientWidth, height: node.clientHeight })
    return () => observer.disconnect()
  }, [node])

  return [ref, size] as const
}

/** Resolves to a blob URL, cleaning up on unmount. */
export function useBlobUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) { setUrl(null); return }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}

/** Runs an async loader, ignoring results that arrive after a newer call. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[], initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [loading, setLoading] = useState(true)

  const run = useCallback(() => {
    let cancelled = false
    setLoading(true)
    loader()
      .then((result) => { if (!cancelled) { setValue(result); setLoading(false) } })
      .catch((error) => { if (!cancelled) { console.error(error); setLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(run, [run])
  return { value, loading, reload: run }
}

/** Debounced mirror of a rapidly-changing value (search boxes). */
export function useDebounced<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/**
 * Long-press that doesn't fight scrolling: cancels on movement beyond a small
 * slop radius, and on pointer-up before the hold completes.
 */
export function useLongPress(handler: (event: PointerEvent) => void, ms = 480) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)

  const clear = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    origin.current = null
  }, [])

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    origin.current = { x: event.clientX, y: event.clientY }
    const native = event.nativeEvent
    timer.current = setTimeout(() => { handler(native); clear() }, ms)
  }, [handler, ms, clear])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!origin.current) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    if (Math.hypot(dx, dy) > 10) clear()
  }, [clear])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
  }
}
