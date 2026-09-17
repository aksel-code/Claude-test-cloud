import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEscape, useFocusTrap, useIsDesktop, useScrollLock } from '@/hooks'
import { Icon } from './Icon'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  /** Shown under the title. Also used as the dialog's accessible description. */
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  /** Desktop width. Mobile is always full-width from the bottom. */
  width?: 'sm' | 'md' | 'lg'
}

/**
 * One overlay component, two presentations: a bottom sheet on touch-sized
 * viewports (thumb-reachable, with a grab handle) and a centred panel on
 * desktop. Both are modal dialogs with a focus trap and Escape to dismiss.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, width = 'md' }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)
  const desktop = useIsDesktop()
  useFocusTrap(panel, open)
  useEscape(onClose, open)
  useScrollLock(open)

  if (!open) return null

  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade-up"
        style={{ animationDuration: '180ms' }}
        tabIndex={-1}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        aria-describedby={subtitle ? 'sheet-subtitle' : undefined}
        tabIndex={-1}
        className={`relative w-full ${widths[width]} max-h-[92vh] sm:max-h-[86vh]
          flex flex-col bg-page border border-rule shadow-float
          rounded-t-2xl sm:rounded-2xl outline-none
          ${desktop ? 'animate-fade-up' : 'animate-sheet-up'}`}
      >
        {!desktop && (
          <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
            <span className="h-1.5 w-11 rounded-full bg-rule" />
          </div>
        )}

        <header className="flex items-start gap-3 px-5 pt-3 pb-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="font-display text-xl text-ink truncate">{title}</h2>
            {subtitle && (
              <p id="sheet-subtitle" className="text-sm text-ink-soft mt-0.5">{subtitle}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="tap -mr-2 -mt-1 text-ink-soft hover:text-ink rounded-full">
            <Icon name="close" size={20} title="Close" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto thin-scroll px-5 pb-5">{children}</div>

        {footer && (
          <footer className="px-5 py-3.5 border-t border-rule bg-surface/70 rounded-b-2xl safe-b">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function Confirm({
  open, title, body, confirmLabel = 'Confirm', destructive, onConfirm, onCancel,
}: ConfirmProps) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      width="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-quiet" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            className={destructive
              ? 'btn text-white bg-terracotta-deep shadow-paper'
              : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-ink-soft leading-relaxed">{body}</p>
    </Sheet>
  )
}
