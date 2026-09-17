import { useId, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/* A small set of form controls with the app's paper styling and AA contrast. */

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string; icon?: IconName }[]
  onChange: (value: T) => void
  /** Render as icons only; `label` on each option still provides the a11y name. */
  compact?: boolean
}

export function Segmented<T extends string>({
  label, value, options, onChange, compact,
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-1 gap-1 bg-sunk rounded-full">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={compact ? option.label : undefined}
            title={compact ? option.label : undefined}
            onClick={() => onChange(option.value)}
            className={`tap rounded-full px-3 text-sm font-medium transition-colors duration-150
              ${active
                ? 'bg-surface text-ink shadow-paper'
                : 'text-ink-soft hover:text-ink'}`}
          >
            {option.icon && <Icon name={option.icon} size={18} />}
            {!compact && <span className={option.icon ? 'ml-1.5' : ''}>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const id = useId()
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className="font-medium text-ink cursor-pointer">{label}</label>
        {description && <p className="text-sm text-ink-soft mt-0.5 leading-snug">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-[52px] h-8 rounded-full transition-colors duration-200
          ${checked ? 'bg-sage-deep' : 'bg-rule'}`}
        style={{ minHeight: 44, paddingBlock: 6, backgroundClip: 'content-box' }}
      >
        <span
          className="absolute top-1/2 block w-6 h-6 rounded-full bg-white shadow-paper
            transition-transform duration-200 ease-spring"
          style={{ transform: `translateY(-50%) translateX(${checked ? 24 : 4}px)` }}
        />
      </button>
    </div>
  )
}

interface SwatchesProps {
  label: string
  value: string
  colors: readonly string[]
  onChange: (color: string) => void
  /** Adds a native colour input for anything not in the preset list. */
  allowCustom?: boolean
}

export function Swatches({ label, value, colors, onChange, allowCustom }: SwatchesProps) {
  const custom = !colors.includes(value)
  return (
    <div>
      <span className="label">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {colors.map((color) => {
          const active = color.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={color}
              title={color}
              onClick={() => onChange(color)}
              className="tap !min-w-0 !min-h-0 w-9 h-9 rounded-full border transition-transform
                duration-150 ease-spring hover:scale-110 relative
                before:absolute before:-inset-[7px] before:content-['']"
              style={{
                background: color,
                borderColor: active ? 'rgb(var(--pb-ink))' : 'rgb(var(--pb-rule))',
                boxShadow: active ? '0 0 0 2px rgb(var(--pb-page)), 0 0 0 4px rgb(var(--pb-ink))' : undefined,
              }}
            >
              {active && (
                <Icon
                  name="check"
                  size={16}
                  className="absolute inset-0 m-auto drop-shadow"
                  style={{ color: isLight(color) ? '#2B2A28' : '#FFFFFF' }}
                />
              )}
            </button>
          )
        })}
        {allowCustom && (
          <label
            className="tap !min-w-0 !min-h-0 w-9 h-9 rounded-full border border-rule cursor-pointer
              grid place-items-center relative overflow-hidden hover:scale-110 transition-transform
              before:absolute before:-inset-[7px] before:content-['']"
            style={{
              background: custom ? value : 'conic-gradient(#C8674A,#D9A441,#8FA58A,#7D98B3,#8E6E9E,#C8674A)',
              boxShadow: custom ? '0 0 0 2px rgb(var(--pb-page)), 0 0 0 4px rgb(var(--pb-ink))' : undefined,
            }}
          >
            <span className="sr-only">Custom colour</span>
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        )}
      </div>
    </div>
  )
}

function isLight(hex: string): boolean {
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  const num = parseInt(full, 16)
  const [r, g, b] = [(num >> 16) & 255, (num >> 8) & 255, num & 255]
  return (r * 299 + g * 587 + b * 114) / 1000 > 140
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step = 1, suffix = '', onChange }: SliderProps) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="label">{label}</label>
        <span className="text-xs tabular-nums text-ink-faint">{Math.round(value)}{suffix}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full h-11 accent-[rgb(var(--pb-terracotta-deep))] cursor-pointer"
      />
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <span className="label">{label}</span>
      {children}
      {hint && <p className="text-xs text-ink-faint mt-1.5 leading-snug">{hint}</p>}
    </div>
  )
}

export function EmptyState({
  icon, title, body, action,
}: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="text-center py-14 px-6 max-w-sm mx-auto">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-sunk grid place-items-center text-ink-faint mb-4">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="font-display text-xl text-ink mb-1.5">{title}</h3>
      <p className="text-ink-soft leading-relaxed mb-5">{body}</p>
      {action}
    </div>
  )
}
