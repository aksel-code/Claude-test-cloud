import { useRef } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { useEditor, type EditorTool } from '@/store/editor'
import { useIsDesktop } from '@/hooks'
import { INK_SWATCHES } from '@/lib/constants'

export type PickerKind = 'sticker' | 'tape' | 'note' | 'shape' | 'background' | null

interface Props {
  onOpenPicker: (kind: Exclude<PickerKind, null>) => void
  onAddText: () => void
  onAddPhoto: (file: File) => void
}

interface ToolButton {
  id: string
  label: string
  icon: IconName
  run: () => void
  active?: boolean
}

/**
 * The toolbar.
 *
 * Bottom bar on phones (thumb-reachable, horizontally scrollable), vertical
 * rail on desktop. Same buttons, same order, same handlers — only the axis
 * changes, so muscle memory survives moving between devices.
 *
 * Drawing tools live behind the pen button: tapping it activates the last-used
 * pen, tapping again opens the ink tray. That keeps the top level to eight
 * items, which is about as many as anyone scans without reading.
 */
export function Toolbar({ onOpenPicker, onAddText, onAddPhoto }: Props) {
  const desktop = useIsDesktop()
  const tool = useEditor((s) => s.tool)
  const setTool = useEditor((s) => s.setTool)
  const fileInput = useRef<HTMLInputElement>(null)

  const drawing = tool !== 'select'

  const buttons: ToolButton[] = [
    { id: 'select', label: 'Select', icon: 'crop', run: () => setTool('select'), active: tool === 'select' },
    { id: 'text', label: 'Text', icon: 'text', run: onAddText },
    { id: 'photo', label: 'Photo', icon: 'image', run: () => fileInput.current?.click() },
    { id: 'sticker', label: 'Stickers', icon: 'sticker', run: () => onOpenPicker('sticker') },
    { id: 'tape', label: 'Tape', icon: 'tape', run: () => onOpenPicker('tape') },
    { id: 'draw', label: 'Draw', icon: 'pen', run: () => setTool(tool === 'select' ? 'pen' : 'select'), active: drawing },
    { id: 'note', label: 'Notes', icon: 'note', run: () => onOpenPicker('note') },
    { id: 'shape', label: 'Shapes', icon: 'shapes', run: () => onOpenPicker('shape') },
    { id: 'paper', label: 'Paper', icon: 'palette', run: () => onOpenPicker('background') },
  ]

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          for (const file of Array.from(event.target.files ?? [])) onAddPhoto(file)
          event.target.value = ''
        }}
      />

      {drawing && <InkTray />}

      <div
        role="toolbar"
        aria-label="Add to page"
        aria-orientation={desktop ? 'vertical' : 'horizontal'}
        className={desktop
          ? 'flex flex-col gap-1 p-2 bg-surface border border-rule rounded-2xl shadow-lift'
          : `flex gap-0.5 overflow-x-auto no-scrollbar px-2 py-1.5
             bg-page/95 backdrop-blur-md border-t border-rule safe-b`}
      >
        {buttons.map((button) => (
          <button
            key={button.id}
            type="button"
            onClick={button.run}
            aria-pressed={button.active ?? undefined}
            title={button.label}
            className={`tap shrink-0 flex-col gap-0.5 rounded-xl px-2.5 text-[10px] font-medium
              transition-colors duration-150
              ${button.active
                ? 'bg-ink text-page'
                : 'text-ink-soft hover:text-ink hover:bg-sunk'}`}
          >
            <Icon name={button.icon} size={21} />
            <span>{button.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

const PENS: { id: EditorTool; label: string; icon: IconName; size: number }[] = [
  { id: 'pen', label: 'Pen', icon: 'pen', size: 8 },
  { id: 'marker', label: 'Marker', icon: 'marker', size: 20 },
  { id: 'highlighter', label: 'Highlighter', icon: 'highlighter', size: 44 },
  { id: 'eraser', label: 'Eraser', icon: 'eraser', size: 0 },
]

/** Ink tray. Appears only while a drawing tool is live. */
function InkTray() {
  const desktop = useIsDesktop()
  const tool = useEditor((s) => s.tool)
  const setTool = useEditor((s) => s.setTool)
  const penColor = useEditor((s) => s.penColor)
  const penSize = useEditor((s) => s.penSize)
  const setPen = useEditor((s) => s.setPen)

  return (
    <div
      className={`flex gap-2 items-center p-2 bg-surface border border-rule rounded-2xl shadow-lift
        animate-fade-up ${desktop ? 'flex-col mb-2' : 'mx-2 mb-1.5 overflow-x-auto no-scrollbar'}`}
      role="group"
      aria-label="Drawing tools"
    >
      <div className={`flex gap-1 ${desktop ? 'flex-col' : ''}`}>
        {PENS.map((pen) => (
          <button
            key={pen.id}
            type="button"
            title={pen.label}
            aria-pressed={tool === pen.id}
            onClick={() => {
              setTool(pen.id)
              if (pen.size) setPen({ size: pen.size })
            }}
            className={`tap !min-w-[44px] rounded-xl transition-colors
              ${tool === pen.id ? 'bg-ink text-page' : 'text-ink-soft hover:bg-sunk'}`}
          >
            <Icon name={pen.icon} size={20} title={pen.label} />
          </button>
        ))}
      </div>

      {tool !== 'eraser' && (
        <>
          <span className={desktop ? 'w-8 h-px bg-rule' : 'w-px h-8 bg-rule'} aria-hidden="true" />

          <div className={`flex gap-1 ${desktop ? 'flex-col' : ''}`} role="radiogroup" aria-label="Ink colour">
            {INK_SWATCHES.slice(0, 8).map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={color === penColor}
                aria-label={color}
                onClick={() => setPen({ color })}
                className="tap !min-w-0 !min-h-0 w-7 h-7 rounded-full border transition-transform
                  duration-150 ease-spring hover:scale-115 relative
                  before:absolute before:-inset-2 before:content-['']"
                style={{
                  background: color,
                  borderColor: color === penColor ? 'rgb(var(--pb-ink))' : 'rgb(var(--pb-rule))',
                  boxShadow: color === penColor
                    ? '0 0 0 2px rgb(var(--pb-surface)), 0 0 0 4px rgb(var(--pb-ink))'
                    : undefined,
                }}
              />
            ))}
          </div>

          <span className={desktop ? 'w-8 h-px bg-rule' : 'w-px h-8 bg-rule'} aria-hidden="true" />

          <label className={`flex items-center gap-2 ${desktop ? 'flex-col py-1' : 'px-1'}`}>
            <span className="sr-only">Nib size</span>
            <input
              type="range"
              min={2}
              max={60}
              value={penSize}
              onChange={(event) => setPen({ size: Number(event.target.value) })}
              className={`accent-[rgb(var(--pb-terracotta-deep))] cursor-pointer
                ${desktop ? 'w-20 -rotate-90 my-6' : 'w-24'}`}
            />
            <span
              className="rounded-full shrink-0 border border-rule"
              style={{
                width: Math.max(6, Math.min(24, penSize / 2.4)),
                height: Math.max(6, Math.min(24, penSize / 2.4)),
                background: penColor,
              }}
              aria-hidden="true"
            />
          </label>
        </>
      )}
    </div>
  )
}
