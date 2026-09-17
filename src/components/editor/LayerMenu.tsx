import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useClickOutside, useEscape } from '@/hooks'
import { useEditor } from '@/store/editor'
import { Icon, type IconName } from '../ui/Icon'
import { describeElement } from '@/lib/elements'
import { haptic } from '@/lib/motion'

interface Props {
  elementId: string
  at: { x: number; y: number }
  onClose: () => void
  onEditText: (id: string) => void
}

/**
 * The long-press menu: layer order, duplicate, lock, delete.
 *
 * Positioned at the press point but clamped inside the viewport, so a
 * long-press near an edge doesn't open a menu half off-screen.
 */
export function LayerMenu({ elementId, at, onClose, onEditText }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const element = useEditor((s) => s.elements.find((el) => el.id === elementId))
  const store = useEditor.getState()

  useClickOutside(ref, onClose)
  useEscape(onClose)

  if (!element) return null

  const items: { icon: IconName; label: string; run: () => void; danger?: boolean }[] = [
    ...(element.type === 'text' || element.type === 'note'
      ? [{ icon: 'text' as IconName, label: 'Edit text', run: () => onEditText(elementId) }]
      : []),
    { icon: 'bringForward', label: 'Bring forward', run: () => store.bringForward(elementId) },
    { icon: 'sendBack', label: 'Send back', run: () => store.sendBackward(elementId) },
    { icon: 'layers', label: 'Bring to front', run: () => store.bringToFront(elementId) },
    { icon: 'duplicate', label: 'Duplicate', run: () => store.duplicate(elementId) },
    {
      icon: element.locked ? 'unlock' : 'lock',
      label: element.locked ? 'Unlock' : 'Lock in place',
      run: () => store.setLocked(elementId, !element.locked),
    },
    {
      icon: 'trash',
      label: 'Delete',
      danger: true,
      run: () => { store.removeElement(elementId); haptic('delete') },
    },
  ]

  const width = 216
  const height = items.length * 44 + 44
  const left = Math.min(Math.max(8, at.x - width / 2), window.innerWidth - width - 8)
  const top = Math.min(Math.max(8, at.y - height - 12), window.innerHeight - height - 8)

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${describeElement(element)}`}
      className="fixed z-50 bg-surface border border-rule rounded-2xl shadow-float
        py-1.5 animate-fade-up overflow-hidden"
      style={{ left, top, width }}
    >
      <p className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint truncate">
        {describeElement(element)}
      </p>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => { item.run(); onClose() }}
          className={`w-full flex items-center gap-3 px-3.5 h-11 text-sm text-left transition-colors
            ${item.danger
              ? 'text-terracotta-deep hover:bg-terracotta/10'
              : 'text-ink hover:bg-sunk'}`}
        >
          <Icon name={item.icon} size={18} />
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
