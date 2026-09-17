import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor } from '@/store/editor'
import { getFont } from '@/content/fonts'
import { noteSpec } from '@/content/notes'
import { PAGE_W } from '@/lib/constants'

interface Props {
  elementId: string
  /** Live stage geometry, so the overlay lands exactly on the node. */
  stageRect: DOMRect | null
  scale: number
  onDone: () => void
}

/**
 * Text editing happens in a real <textarea> laid over the canvas, not in Konva.
 *
 * Canvas text editing means reimplementing the caret, selection, IME
 * composition, autocorrect, spellcheck and every platform's text shortcuts —
 * badly. A positioned textarea inherits all of it for free, and because it
 * matches the node's font, size, colour and rotation, the switch between
 * editing and not editing is almost invisible.
 */
export function TextOverlay({ elementId, stageRect, scale, onDone }: Props) {
  const element = useEditor((s) => s.elements.find((el) => el.id === elementId))
  const updateProps = useEditor((s) => s.updateProps)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState('')

  const isText = element?.type === 'text'
  const isNote = element?.type === 'note'

  useEffect(() => {
    if (isText) setDraft(element.props.text)
    else if (isNote) setDraft(element.props.text)
  }, [elementId, isText, isNote, element])

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    node.focus({ preventScroll: true })
    // Caret to the end rather than selecting everything: people usually mean
    // to keep typing, not to replace.
    node.setSelectionRange(node.value.length, node.value.length)
  }, [elementId])

  if (!element || (!isText && !isNote) || !stageRect) return null

  function commit() {
    updateProps(elementId, { text: draft })
    onDone()
  }

  const font = getFont(isText ? element.props.font : (element as typeof element & { props: { font: string } }).props.font)

  // Notes inset their text; a plain text block fills its box.
  const pad = isNote ? noteSpec((element as { props: { style: Parameters<typeof noteSpec>[0] } }).props.style).padding : [0, 0, 0, 0]
  const boxW = element.width * (1 - pad[0] - pad[2])
  const boxH = element.height * (1 - pad[1] - pad[3])
  const offsetX = element.width * pad[0]
  const offsetY = element.height * pad[1]

  const fontSize = (isText ? element.props.fontSize : (element as { props: { fontSize: number } }).props.fontSize) * font.scale
  const color = isText ? element.props.color : (element as { props: { color: string } }).props.color

  return createPortal(
    <>
      {/* Click-away target. Tapping the page commits, like putting the pen down. */}
      <div
        className="fixed inset-0 z-40"
        onPointerDown={commit}
        aria-hidden="true"
      />

      <textarea
        ref={ref}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); onDone() }
          // Enter inserts a newline (this is a journal); Cmd/Ctrl+Enter is done.
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            commit()
          }
          event.stopPropagation()
        }}
        aria-label={isNote ? 'Note text' : 'Text block'}
        spellCheck
        className="fixed z-50 resize-none bg-transparent outline-none overflow-hidden
          caret-terracotta selection:bg-mustard/40"
        style={{
          left: stageRect.left + (element.x - element.width / 2 + offsetX) * scale,
          top: stageRect.top + (element.y - element.height / 2 + offsetY) * scale,
          width: boxW * scale,
          height: Math.max(boxH, fontSize * 1.6) * scale,
          transform: `rotate(${element.rotation}deg)`,
          transformOrigin: `${(element.width / 2 - offsetX) * scale}px ${(element.height / 2 - offsetY) * scale}px`,
          fontFamily: font.stack,
          fontSize: fontSize * scale,
          fontWeight: font.weight,
          lineHeight: isText ? element.props.lineHeight : 1.34,
          letterSpacing: isText ? `${element.props.letterSpacing * scale}px` : undefined,
          textAlign: isText ? element.props.align : 'left',
          color,
          padding: 0,
          border: 0,
          // A soft wash behind the caret makes it obvious you're in edit mode
          // without hiding the paper underneath.
          boxShadow: `0 0 0 ${Math.max(2, 3 * scale)}px rgb(200 103 74 / 0.22)`,
          borderRadius: 3,
          maxWidth: PAGE_W * scale,
        }}
      />
    </>,
    document.body,
  )
}
