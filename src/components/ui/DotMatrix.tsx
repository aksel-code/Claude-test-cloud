import { useEffect, useRef } from 'react'
import { prefersReducedMotion, springEase } from '@/lib/motion'

interface DotMatrixProps {
  className?: string
  /**
   * 'assemble' plays the scan-in once, then goes still.
   * 'ambient' drifts forever, never assembling — for a texture that's always
   * mid-scene (loading states, tiny badges).
   * 'landing' plays the scan-in, THEN keeps breathing forever — the one to
   * reach for anywhere someone actually lands and looks around, since
   * 'assemble' alone goes still and reads as inert after a second.
   */
  variant?: 'assemble' | 'ambient' | 'landing'
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
 * Tune `spacing`/`radius`/`opacity` deliberately bold where this is meant to
 * read as a graphic element (hero bands) rather than a faint texture — the
 * halftone dots in the reference art are a loud, legible pattern, not
 * background noise.
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
    const assembles = variant === 'assemble' || variant === 'landing'
    const ambientAfter = variant === 'ambient' || variant === 'landing'
    const ASSEMBLE_MS = 900

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

      const assembling = assembles && !reduced && t < ASSEMBLE_MS + 500

      for (const dot of dots) {
        let r: number
        let a: number

        if (assembling) {
          const local = Math.max(0, Math.min(1, (t - dot.delay * 400) / ASSEMBLE_MS))
          const eased = springEase(local)
          r = radius * eased
          a = eased
        } else if (ambientAfter && !reduced) {
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

    if (reduced) {
      paint(0)
    } else if (assembles) {
      const start = performance.now()
      const loop = (now: number) => {
        const elapsed = now - start
        paint(elapsed)
        if (ambientAfter || elapsed < ASSEMBLE_MS + 500) raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    } else if (ambientAfter) {
      const loop = (now: number) => { paint(now); raf = requestAnimationFrame(loop) }
      raf = requestAnimationFrame(loop)
    } else {
      paint(10_000)
    }

    const ro = new ResizeObserver(() => { layout(); if (reduced) paint(0) })
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
