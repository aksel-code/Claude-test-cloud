interface ScreenHeaderProps {
  /** Small mono label above the title, e.g. "PAGEBOUND · 04" */
  eyebrow: string
  title: string
  subtitle?: string
  /** Right-aligned technical readout, e.g. a count or a date. */
  meta?: string
  children?: React.ReactNode
}

/**
 * The technical masthead used at the top of every non-hero screen (Calendar,
 * Moods, Search, Settings, Journal). One shared component so the "record
 * sleeve" register — mono eyebrow, tabular meta, a hairline tick rule —
 * stays consistent everywhere instead of hand-rolled per screen.
 *
 * The big display title underneath is unchanged from the original app: this
 * adds a technical frame around the existing warm typography rather than
 * replacing it.
 */
export function ScreenHeader({ eyebrow, title, subtitle, meta, children }: ScreenHeaderProps) {
  return (
    <header className="mb-7 md:mb-9">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="tech-label text-signal-deep dark:text-signal animate-fade-up" style={{ animationDuration: '320ms' }}>
          {eyebrow}
        </p>
        {meta && <p className="tech-label text-ink-faint tabular-nums shrink-0">{meta}</p>}
      </div>

      <div className="h-px bg-gradient-to-r from-signal/50 via-rule to-transparent mb-4" aria-hidden="true" />

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-ink leading-none animate-glitch-in">
            {title}
          </h1>
          {subtitle && <p className="text-ink-soft mt-1.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  )
}
