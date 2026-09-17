import { useEditor, useSelectedElement } from '@/store/editor'
import { Icon } from '../ui/Icon'
import { Segmented, Slider, Swatches } from '../ui/Controls'
import { FONTS, getFont } from '@/content/fonts'
import { TAPES, tapeCss } from '@/content/tapes'
import { INK_SWATCHES, PAPER_SWATCHES } from '@/lib/constants'
import { describeElement } from '@/lib/elements'
import { haptic } from '@/lib/motion'
import type { PhotoFrame, TextAlign } from '@/lib/types'

/**
 * Properties panel for the selected element.
 *
 * Lives in a scrollable strip above the toolbar on phones and as a right-hand
 * column on desktop. Only shows controls that apply to the current type — a
 * panel of greyed-out fields is worse than no panel.
 */
export function Inspector({ onEditText }: { onEditText: (id: string) => void }) {
  const element = useSelectedElement()
  const updateProps = useEditor((s) => s.updateProps)
  const updateElement = useEditor((s) => s.updateElement)
  const removeElement = useEditor((s) => s.removeElement)
  const duplicate = useEditor((s) => s.duplicate)
  const setLocked = useEditor((s) => s.setLocked)
  const bringForward = useEditor((s) => s.bringForward)
  const sendBackward = useEditor((s) => s.sendBackward)

  if (!element) return null

  return (
    <div
      className="bg-surface border border-rule rounded-2xl shadow-lift p-3 animate-fade-up"
      role="region"
      aria-label={`Selected: ${describeElement(element)}`}
    >
      {/* Actions that apply to everything. */}
      <div className="flex items-center gap-1 mb-1 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint px-1.5 mr-auto truncate max-w-[9rem]">
          {element.type}
        </span>
        <IconAction icon="bringForward" label="Bring forward" onClick={() => bringForward(element.id)} />
        <IconAction icon="sendBack" label="Send back" onClick={() => sendBackward(element.id)} />
        <IconAction icon="duplicate" label="Duplicate" onClick={() => duplicate(element.id)} />
        <IconAction
          icon={element.locked ? 'lock' : 'unlock'}
          label={element.locked ? 'Unlock' : 'Lock'}
          active={element.locked}
          onClick={() => setLocked(element.id, !element.locked)}
        />
        <IconAction
          icon="trash"
          label="Delete"
          danger
          onClick={() => { removeElement(element.id); haptic('delete') }}
        />
      </div>

      <div className="max-h-[38vh] md:max-h-[52vh] overflow-y-auto thin-scroll px-1 pb-1 space-y-4">
        {element.type === 'text' && (
          <>
            <button type="button" className="btn-quiet w-full" onClick={() => onEditText(element.id)}>
              <Icon name="text" size={17} />
              Edit text
            </button>

            <FontPicker
              value={element.props.font}
              onChange={(font) => updateProps(element.id, { font })}
            />

            <Slider
              label="Size"
              value={element.props.fontSize}
              min={16}
              max={160}
              suffix="pt"
              onChange={(fontSize) => updateProps(element.id, { fontSize })}
            />

            <div>
              <span className="label">Alignment</span>
              <Segmented<TextAlign>
                label="Text alignment"
                compact
                value={element.props.align}
                onChange={(align) => updateProps(element.id, { align })}
                options={[
                  { value: 'left', label: 'Left', icon: 'align' },
                  { value: 'center', label: 'Centre', icon: 'alignCenter' },
                  { value: 'right', label: 'Right', icon: 'alignRight' },
                ]}
              />
            </div>

            <Swatches
              label="Ink"
              value={element.props.color}
              colors={INK_SWATCHES}
              onChange={(color) => updateProps(element.id, { color })}
              allowCustom
            />

            <Slider
              label="Line spacing"
              value={element.props.lineHeight * 100}
              min={90}
              max={220}
              suffix="%"
              onChange={(value) => updateProps(element.id, { lineHeight: value / 100 })}
            />
          </>
        )}

        {element.type === 'photo' && (
          <>
            <div>
              <span className="label">Frame</span>
              <div className="grid grid-cols-5 gap-1.5">
                {(['polaroid', 'torn', 'rounded', 'filmstrip', 'none'] as PhotoFrame[]).map((frame) => (
                  <button
                    key={frame}
                    type="button"
                    aria-pressed={element.props.frame === frame}
                    onClick={() => updateProps(element.id, { frame })}
                    className={`rounded-lg p-1.5 text-[10px] capitalize transition-colors
                      ${element.props.frame === frame ? 'bg-sunk ring-2 ring-ink text-ink' : 'text-ink-soft hover:bg-sunk/60'}`}
                  >
                    <FrameGlyph frame={frame} />
                    {frame === 'filmstrip' ? 'film' : frame}
                  </button>
                ))}
              </div>
            </div>

            {element.props.frame === 'polaroid' && (
              <label className="block">
                <span className="label">Caption</span>
                <input
                  className="field"
                  value={element.props.caption}
                  placeholder="Write under the photo"
                  maxLength={60}
                  onChange={(event) => updateProps(element.id, { caption: event.target.value })}
                />
              </label>
            )}

            <label className="block">
              <span className="label">Alt text</span>
              <input
                className="field"
                value={element.props.alt}
                placeholder="Describe this photo"
                maxLength={160}
                onChange={(event) => updateProps(element.id, { alt: event.target.value })}
              />
              <p className="text-xs text-ink-faint mt-1.5">
                Read aloud by screen readers, and used when you export the page.
              </p>
            </label>

            <Slider
              label="Warmth"
              value={element.props.warmth * 100}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => updateProps(element.id, { warmth: value / 100 })}
            />
          </>
        )}

        {element.type === 'note' && (
          <>
            <button type="button" className="btn-quiet w-full" onClick={() => onEditText(element.id)}>
              <Icon name="text" size={17} />
              Edit note
            </button>
            <FontPicker value={element.props.font} onChange={(font) => updateProps(element.id, { font })} />
            <Slider
              label="Size"
              value={element.props.fontSize}
              min={14}
              max={90}
              suffix="pt"
              onChange={(fontSize) => updateProps(element.id, { fontSize })}
            />
            <Swatches
              label="Paper"
              value={element.props.paper}
              colors={PAPER_SWATCHES}
              onChange={(paper) => updateProps(element.id, { paper })}
              allowCustom
            />
            <Swatches
              label="Ink"
              value={element.props.color}
              colors={INK_SWATCHES}
              onChange={(color) => updateProps(element.id, { color })}
              allowCustom
            />
          </>
        )}

        {element.type === 'tape' && (
          <>
            <div>
              <span className="label">Pattern</span>
              <div className="grid grid-cols-5 gap-1.5">
                {TAPES.map((tape) => (
                  <button
                    key={tape.id}
                    type="button"
                    title={tape.name}
                    aria-label={tape.name}
                    aria-pressed={element.props.patternId === tape.id}
                    onClick={() => updateProps(element.id, { patternId: tape.id })}
                    className={`h-9 rounded transition-transform hover:scale-105
                      ${element.props.patternId === tape.id ? 'ring-2 ring-ink ring-offset-2 ring-offset-[rgb(var(--pb-surface))]' : ''}`}
                    style={{ background: tapeCss(tape, element.props.color), opacity: tape.alpha }}
                  />
                ))}
              </div>
            </div>
            <Swatches
              label="Colour"
              value={element.props.color}
              colors={PAPER_SWATCHES}
              onChange={(color) => updateProps(element.id, { color })}
              allowCustom
            />
          </>
        )}

        {(element.type === 'shape' || element.type === 'doodle') && (
          <>
            <Swatches
              label="Ink"
              value={element.props.color}
              colors={INK_SWATCHES}
              onChange={(color) => updateProps(element.id, { color })}
              allowCustom
            />
            <Slider
              label="Thickness"
              value={element.type === 'shape' ? element.props.strokeWidth : element.props.size}
              min={1}
              max={element.type === 'shape' ? 24 : 60}
              onChange={(value) => updateProps(
                element.id,
                element.type === 'shape' ? { strokeWidth: value } : { size: value },
              )}
            />
          </>
        )}

        {element.type === 'sticker' && element.props.tint !== undefined && (
          <Swatches
            label="Colour"
            value={element.props.tint}
            colors={INK_SWATCHES}
            onChange={(tint) => updateProps(element.id, { tint })}
            allowCustom
          />
        )}

        <Slider
          label="Opacity"
          value={element.opacity * 100}
          min={10}
          max={100}
          suffix="%"
          onChange={(value) => updateElement(element.id, { opacity: value / 100 })}
        />

        <Slider
          label="Rotation"
          value={element.rotation}
          min={-180}
          max={180}
          suffix="°"
          onChange={(rotation) => updateElement(element.id, { rotation })}
        />
      </div>
    </div>
  )
}

function IconAction({
  icon, label, onClick, danger, active,
}: { icon: Parameters<typeof Icon>[0]['name']; label: string; onClick: () => void; danger?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`tap !min-w-[40px] !min-h-[40px] rounded-lg transition-colors
        ${danger ? 'text-ink-soft hover:text-terracotta-deep hover:bg-terracotta/10'
          : active ? 'bg-ink text-page'
          : 'text-ink-soft hover:text-ink hover:bg-sunk'}`}
    >
      <Icon name={icon} size={18} title={label} />
    </button>
  )
}

function FontPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <span className="label">Handwriting</span>
      <div role="radiogroup" aria-label="Font" className="grid grid-cols-2 gap-1.5">
        {FONTS.map((font) => (
          <button
            key={font.id}
            type="button"
            role="radio"
            aria-checked={font.id === value}
            onClick={() => onChange(font.id)}
            className={`px-2.5 py-2 rounded-lg text-left truncate transition-colors min-h-[44px]
              ${font.id === value ? 'bg-sunk ring-2 ring-ink' : 'hover:bg-sunk/60'}`}
            style={{ fontFamily: getFont(font.id).stack, fontSize: 17 }}
          >
            {font.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function FrameGlyph({ frame }: { frame: PhotoFrame }) {
  return (
    <svg viewBox="0 0 28 28" className="w-full h-7 mb-0.5" aria-hidden="true">
      {frame === 'polaroid' && (
        <>
          <rect x="4" y="3" width="20" height="22" rx="1" fill="#FFFDF8" stroke="currentColor" strokeWidth="1.2" />
          <rect x="6.5" y="5.5" width="15" height="13" fill="currentColor" opacity=".3" />
        </>
      )}
      {frame === 'torn' && (
        <path d="M4 4l4 .8 4-.8 4 1 4-1 3 .6-.6 4 .6 4-.8 4 .8 5-4-.7-4 .7-4-.8-4 .8-3.4-.6.6-4-.6-4Z"
          fill="currentColor" opacity=".3" stroke="currentColor" strokeWidth="1" />
      )}
      {frame === 'rounded' && <rect x="4" y="5" width="20" height="18" rx="4" fill="currentColor" opacity=".3" stroke="currentColor" strokeWidth="1.2" />}
      {frame === 'filmstrip' && (
        <>
          <rect x="3" y="5" width="22" height="18" fill="currentColor" opacity=".8" />
          <rect x="5.5" y="9" width="17" height="10" fill="#FFFDF8" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={5 + i * 4.8} y="6" width="2.6" height="2" fill="#FFFDF8" />
              <rect x={5 + i * 4.8} y="20" width="2.6" height="2" fill="#FFFDF8" />
            </g>
          ))}
        </>
      )}
      {frame === 'none' && <rect x="4" y="5" width="20" height="18" fill="currentColor" opacity=".3" />}
    </svg>
  )
}
