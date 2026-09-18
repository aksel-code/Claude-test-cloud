import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

interface PixelRevealProps {
  /** Grid density. More cells reads closer to a fine halftone dissolve. */
  cols?: number
  rows?: number
  color?: string
}

/**
 * A one-shot mosaic wipe: a full-viewport grid of solid cells that shrink
 * away in a staggered sweep, revealing the screen underneath — the closest
 * thing in this app to the pixel-dissolve photograph in the reference
 * moodboard, played as a transition instead of a static effect.
 *
 * Mount this fresh (give it a `key` that changes with whatever navigation
 * should trigger it) and it plays once, then removes itself from the DOM.
 * Respects prefers-reduced-motion by not rendering at all — a wipe is pure
 * decoration, never load-bearing for revealing content that's otherwise
 * hidden.
 */
export function PixelReveal({ cols = 14, rows = 9, color }: PixelRevealProps) {
  const [visible, setVisible] = useState(() => !prefersReducedMotion())

  useEffect(() => {
    if (!visible) return
    // The last cell's delay (opposite corner) plus its own animation length.
    const maxDelay = (cols - 1 + rows - 1) * 14
    const timer = setTimeout(() => setVisible(false), maxDelay + 320 + 60)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  const cells = Array.from({ length: cols * rows })

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none grid"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      aria-hidden="true"
    >
      {cells.map((_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        // Diagonal sweep: delay grows with distance from the top-left corner.
        const delay = (col + row) * 14
        return (
          <span
            key={i}
            className="block"
            style={{
              background: color ?? 'rgb(var(--pb-chrome))',
              transformOrigin: 'center',
              animation: `pixel-out 320ms cubic-bezier(0.3, 0, 0.2, 1) ${delay}ms both`,
            }}
          />
        )
      })}
    </div>
  )
}
