import { useEffect, useRef } from 'react'
import { prefersReducedMotion, springEase } from '@/lib/motion'

interface DotMatrixProps {
  className?: string
  /** 'assemble' animates once on mount; 'ambient' drifts forever, very slowly. */
  variant?: 'assemble' | 'ambient'
  /** Spacing between dot centres, in CSS px at 1x. */
  spacing?: number
  /** Base dot radius, in CSS px at 1x. */
  radius?: number
  /** CSS colour for the dots. Defaults to the signal token. */
  color?: string
  /** 0-1, multiplies every dot's alpha. */
  opacity?: number
}

/**
 * A synthesized halftone / dot-matrix field, drawn on canvas rather than
 * sampled from an image — the "PRACTISE DESIGN RECORD" moodboard reference
 * this app's new chrome borrows from is itself a generated pattern, not a
 * photo dissolve.
 *
 * 'assemble': every dot starts at a random offset and fades in from zero
 * radius; they settle into a grid with a per-dot delay driven by distance
 * from the top-left, so the field reads as scanning into place once, then
 * goes still. 'ambient': dots sit on the grid permanently and only their
 * radius breathes, on a slow per-dot phase offset — safe to leave running
 * behind text since nothing moves position.
 *
 * Respects prefers-reduced-motion by rendering the settled frame directly,
 * matching the convention in lib/motion.ts used everywhere else.
 */
export function DotMatrix({
  className = '',
  variant = 'ambient',
  spacing = 22,
  radius = 1.6,
  color,
  opacity = 1,
}: DotMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = prefersReducedMotion()
    let raf = 0
    let width = 0
    let height = 0
    let dpr = 1
    let dots: { gx: number; gy: number; seed: number; delay: number }[] = []

    // Canvas fillStyle doesn't resolve `currentColor` reliably across engines,
    // so read the element's actually-computed colour (set via inline style
    // below, which is itself either the `color` prop or the signal token).
    const resolvedColor = getComputedStyle(canvas).color

    function layout() {
      const canvasEl = canvasRef.current
      if (!canvasEl) return
      const rect = canvasEl.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvasEl.width = width * dpr
      canvasEl.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cols = Math.ceil(width / spacing) + 1
      const rows = Math.ceil(height / spacing) + 1
      const maxDist = Math.hypot(cols, rows)
      dots = []
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          dots.push({
            gx: col * spacing,
            gy: row * spacing,
            seed: (Math.sin(col * 12.9898 + row * 78.233) * 43758.5453) % 1,
            delay: Math.hypot(col, row) / maxDist,
          })
        }
      }
    }

    function paint(t: number) {
      ctx!.clearRect(0, 0, width, height)
      ctx!.fillStyle = resolvedColor

      for (const dot of dots) {
        let r: number
        let a: number

        if (variant === 'assemble' && !reduced) {
          const local = Math.max(0, Math.min(1, (t - dot.delay * 500) / 500))
          const eased = springEase(local)
          r = radius * eased
          a = eased
        } else if (variant === 'ambient' && !reduced) {
          const phase = (t / 2600) + dot.seed * Math.PI * 2
          const wave = 0.55 + 0.45 * Math.sin(phase)
          r = radius * wave
          a = 0.35 + 0.65 * wave
        } else {
          r = radius
          a = 0.7
        }

        if (r <= 0.05) continue
        ctx!.globalAlpha = a * opacity
        ctx!.beginPath()
        ctx!.arc(dot.gx, dot.gy, r, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
    }

    layout()

    if (reduced || variant === 'assemble') {
      paint(reduced ? 0 : 10_000)
    }

    if (!reduced && variant === 'ambient') {
      const loop = (now: number) => { paint(now); raf = requestAnimationFrame(loop) }
      raf = requestAnimationFrame(loop)
    } else if (!reduced && variant === 'assemble') {
      const start = performance.now()
      const loop = (now: number) => {
        const elapsed = now - start
        paint(elapsed)
        if (elapsed < 1400) raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => { layout(); if (reduced || variant !== 'ambient') paint(reduced ? 0 : 10_000) })
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [variant, spacing, radius, color, opacity])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ color: color ?? 'rgb(var(--pb-signal))', width: '100%', height: '100%', display: 'block' }}
    />
  )
}
