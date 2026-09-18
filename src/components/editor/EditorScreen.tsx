import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useEditor } from '@/store/editor'
import { useLibrary } from '@/store/library'
import { useElementSize, useIsDesktop } from '@/hooks'
import { EditorCanvas } from './EditorCanvas'
import { Toolbar, type PickerKind } from './Toolbar'
import { Inspector } from './Inspector'
import { TextOverlay } from './TextOverlay'
import { LayerMenu } from './LayerMenu'
import {
  BackgroundPicker, NotePicker, ShapePicker, StickerPicker, TapePicker,
} from './pickers'
import { PageMetaSheet } from './PageMetaSheet'
import { ExportSheet } from '../export/ExportSheet'
import { Icon } from '../ui/Icon'
import { toast } from '../ui/Toast'
import { createPhoto, createText, describeElement } from '@/lib/elements'
import { importImage } from '@/lib/image'
import { formatRelative } from '@/lib/date'
import { getMood } from '@/content/moods'
import { haptic } from '@/lib/motion'
import { PAGE_H, PAGE_W } from '@/lib/constants'

export default function EditorScreen() {
  const { pageId = '' } = useParams()
  const navigate = useNavigate()

  const load = useEditor((s) => s.load)
  const reset = useEditor((s) => s.reset)
  const flush = useEditor((s) => s.flush)
  const loading = useEditor((s) => s.loading)
  const loadedId = useEditor((s) => s.pageId)
  const journalId = useEditor((s) => s.journalId)
  const date = useEditor((s) => s.date)
  const title = useEditor((s) => s.title)
  const mood = useEditor((s) => s.mood)
  const tags = useEditor((s) => s.tags)
  const elements = useEditor((s) => s.elements)
  const selectedId = useEditor((s) => s.selectedId)
  const addElement = useEditor((s) => s.addElement)

  const journal = useLibrary((s) => s.journals.find((j) => j.id === journalId))
  const refreshLibrary = useLibrary((s) => s.refresh)

  const desktop = useIsDesktop()
  const [stageHost, stageSize] = useElementSize<HTMLDivElement>()
  const stageWrap = useRef<HTMLDivElement>(null)

  const [picker, setPicker] = useState<PickerKind>(null)
  const [editingText, setEditingText] = useState<string | null>(null)
  const [layerMenu, setLayerMenu] = useState<{ id: string; at: { x: number; y: number } } | null>(null)
  const [meta, setMeta] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [stageRect, setStageRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    void load(pageId)
    return () => {
      // Never lose work on the way out.
      void useEditor.getState().flush().then(() => {
        useEditor.getState().reset()
        void useLibrary.getState().refresh()
      })
    }
  }, [pageId, load, reset])

  // Persist on tab hide too: mobile browsers often kill a backgrounded tab
  // without ever firing unload.
  useEffect(() => {
    const onHide = () => { void flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [flush])

  const scale = stageSize.width > 0
    ? Math.min(stageSize.width / PAGE_W, stageSize.height / PAGE_H)
    : 0

  // The text overlay is positioned in viewport space, so it needs the live
  // stage rect — which moves on scroll and on resize.
  useEffect(() => {
    if (!editingText) return
    const update = () => {
      const node = stageWrap.current?.querySelector('canvas')
      setStageRect(node?.getBoundingClientRect() ?? null)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [editingText, scale])

  const addPhoto = useCallback(async (file: File) => {
    try {
      const { asset, ratio } = await importImage(file)
      addElement(createPhoto(asset.id, ratio, {
        x: PAGE_W / 2 + (Math.random() - 0.5) * 120,
        y: PAGE_H * 0.4 + (Math.random() - 0.5) * 120,
        alt: '',
      }))
      haptic('place')
    } catch (error) {
      console.error(error)
      toast('That image could not be added.', { tone: 'warn' })
    }
  }, [addElement])

  const addTextBlock = useCallback(() => {
    const element = createText('', { x: PAGE_W / 2, y: PAGE_H * 0.36 })
    addElement(element)
    setEditingText(element.id)
  }, [addElement])

  /* ------------------------------------------------------- drop to place */

  useEffect(() => {
    const host = stageWrap.current
    if (!host) return
    const prevent = (event: DragEvent) => { event.preventDefault() }
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      for (const file of Array.from(event.dataTransfer?.files ?? [])) {
        if (file.type.startsWith('image/')) void addPhoto(file)
      }
    }
    host.addEventListener('dragover', prevent)
    host.addEventListener('drop', onDrop)
    return () => {
      host.removeEventListener('dragover', prevent)
      host.removeEventListener('drop', onDrop)
    }
    // `loadedId` is in the deps so this re-runs once the real tree replaces the
    // loading placeholder — otherwise `stageWrap.current` is still null here.
  }, [addPhoto, loadedId])

  /* --------------------------------------------------- keyboard shortcuts */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      // Never steal keys from a field the user is typing in.
      if (target && (target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return

      const store = useEditor.getState()
      const mod = event.metaKey || event.ctrlKey

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) store.redo()
        else store.undo()
        return
      }
      if (mod && event.key.toLowerCase() === 'y') { event.preventDefault(); store.redo(); return }

      if (!store.selectedId) {
        // Tab with nothing selected enters the page at the top of the stack.
        if (event.key === 'Tab' && store.elements.length > 0) {
          event.preventDefault()
          const sorted = store.elements.slice().sort((a, b) => b.zIndex - a.zIndex)
          store.select(sorted[0].id)
        }
        return
      }

      const selected = store.elements.find((el) => el.id === store.selectedId)
      if (!selected) return

      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        store.duplicate(selected.id)
        return
      }

      switch (event.key) {
        case 'Escape':
          store.select(null)
          break
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          if (!selected.locked) { store.removeElement(selected.id); haptic('delete') }
          break
        case 'Enter':
          if (selected.type === 'text' || selected.type === 'note') {
            event.preventDefault()
            setEditingText(selected.id)
          }
          break
        case 'Tab': {
          event.preventDefault()
          const sorted = store.elements.slice().sort((a, b) => b.zIndex - a.zIndex)
          const index = sorted.findIndex((el) => el.id === selected.id)
          const next = sorted[(index + (event.shiftKey ? -1 : 1) + sorted.length) % sorted.length]
          store.select(next.id)
          break
        }
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          if (selected.locked) return
          event.preventDefault()
          // Shift for a coarse nudge, plain for a fine one.
          const step = event.shiftKey ? 24 : 4
          const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
          const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
          if (event.altKey) {
            store.updateElement(selected.id, { rotation: selected.rotation + (dx || dy) / 2 })
          } else {
            store.updateElement(selected.id, { x: selected.x + dx, y: selected.y + dy })
          }
          break
        }
        case ']':
          store.bringForward(selected.id)
          break
        case '[':
          store.sendBackward(selected.id)
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (loading || loadedId !== pageId) {
    return (
      <div className="min-h-dvh grid place-items-center bg-page">
        <p className="text-ink-faint">Opening page&hellip;</p>
      </div>
    )
  }

  const moodSpec = getMood(mood)

  return (
    <div className="h-dvh flex flex-col bg-page overflow-hidden">
      {/* -------------------------------------------------------- header */}
      <header className="flex items-center gap-1.5 px-2 sm:px-3 h-14 shrink-0 border-b border-rule safe-t">
        <button
          type="button"
          onClick={async () => { await flush(); await refreshLibrary(); navigate(journalId ? `/journal/${journalId}` : '/') }}
          className="tap rounded-lg text-ink-soft hover:text-ink hover:bg-sunk"
        >
          <Icon name="chevronLeft" size={22} title="Back" />
        </button>

        <button
          type="button"
          onClick={() => setMeta(true)}
          className="flex-1 min-w-0 text-left px-1.5 py-1 rounded-lg hover:bg-sunk transition-colors"
        >
          <span className="block text-sm font-medium text-ink truncate leading-tight">
            {title || formatRelative(date)}
          </span>
          <span className="block text-xs text-ink-faint truncate">
            {journal?.title ?? 'Journal'}
            {tags.length > 0 && <> &middot; #{tags.join(' #')}</>}
          </span>
        </button>

        {moodSpec && (
          <span
            className="shrink-0 w-6 h-6 rounded-full border-2 border-page shadow-paper"
            style={{ background: moodSpec.color }}
            title={`Mood: ${moodSpec.label}`}
          />
        )}

        <SaveIndicator />

        <UndoRedo />

        <button
          type="button"
          onClick={() => setExporting(true)}
          className="tap rounded-lg text-ink-soft hover:text-ink hover:bg-sunk"
        >
          <Icon name="share" size={20} title="Export or share" />
        </button>
      </header>

      {/* --------------------------------------------------------- body */}
      <div className="flex-1 min-h-0 flex">
        {desktop && (
          <div className="shrink-0 p-3 flex flex-col gap-3 overflow-y-auto thin-scroll">
            <Toolbar
              onOpenPicker={setPicker}
              onAddText={addTextBlock}
              onAddPhoto={(file) => void addPhoto(file)}
            />
          </div>
        )}

        {/* The measured host is absolutely positioned on purpose: a percentage
            height inside an auto-sized grid row can't resolve, so `h-full` here
            would collapse to zero and the stage would never get a size. */}
        <div
          ref={stageWrap}
          className="flex-1 min-w-0 relative overflow-hidden"
          style={{ background: 'rgb(var(--pb-canvas-backdrop))' }}
        >
          <div ref={stageHost} className="absolute inset-3 sm:inset-6 grid place-items-center">
            {scale > 0 && (
              <div
                className="shadow-float rounded-[2px] overflow-hidden"
                style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
              >
                <EditorCanvas
                  width={stageSize.width}
                  height={stageSize.height}
                  onEditText={setEditingText}
                  onLayerMenu={(id, at) => setLayerMenu({ id, at })}
                />
              </div>
            )}
          </div>
        </div>

        {desktop && selectedId && (
          <aside className="w-[292px] shrink-0 p-3 overflow-y-auto thin-scroll">
            <Inspector onEditText={setEditingText} />
          </aside>
        )}
      </div>

      {/* --------------------------------------------------- mobile chrome
          Inspector is an overlay anchored above the toolbar (`bottom-full`),
          not a flex sibling of the canvas: a fixed inline block here used to
          shrink the canvas's flex-1 share by up to 38vh whenever something
          was selected, which is the "modules block the page" complaint.
          Floating it costs nothing in canvas space — it only covers the
          bottom slice of the page itself, which is fine since that's not
          where you're looking while adjusting the selected element's props. */}
      {!desktop && (
        <div className="shrink-0 relative">
          {selectedId && (
            <div className="absolute inset-x-0 bottom-full px-2 pb-1.5">
              <Inspector onEditText={setEditingText} />
            </div>
          )}
          <Toolbar
            onOpenPicker={setPicker}
            onAddText={addTextBlock}
            onAddPhoto={(file) => void addPhoto(file)}
          />
        </div>
      )}

      {/* ------------------------------------------- screen-reader surface */}
      <ElementList onEditText={setEditingText} />

      {/* ------------------------------------------------------- overlays */}
      <StickerPicker open={picker === 'sticker'} onClose={() => setPicker(null)} />
      <TapePicker open={picker === 'tape'} onClose={() => setPicker(null)} />
      <NotePicker open={picker === 'note'} onClose={() => setPicker(null)} />
      <ShapePicker open={picker === 'shape'} onClose={() => setPicker(null)} />
      <BackgroundPicker open={picker === 'background'} onClose={() => setPicker(null)} />
      <PageMetaSheet open={meta} onClose={() => setMeta(false)} />

      {journal && (
        <ExportSheet
          open={exporting}
          onClose={() => setExporting(false)}
          journal={journal}
          pages={[]}
          singlePageId={pageId}
        />
      )}

      {editingText && (
        <TextOverlay
          elementId={editingText}
          stageRect={stageRect}
          scale={scale}
          onDone={() => setEditingText(null)}
        />
      )}

      {layerMenu && (
        <LayerMenu
          elementId={layerMenu.id}
          at={layerMenu.at}
          onClose={() => setLayerMenu(null)}
          onEditText={(id) => { setLayerMenu(null); setEditingText(id) }}
        />
      )}

      {elements.length === 0 && (
        <p className="pointer-events-none fixed inset-x-0 top-1/2 -translate-y-1/2 text-center
          text-ink-faint text-sm px-8">
          An empty page. Add a photo, then tape it down.
        </p>
      )}

      {!journal && (
        <Link to="/" className="sr-only-focusable fixed top-2 left-2 btn-primary z-50">
          Back to library
        </Link>
      )}
    </div>
  )
}

/**
 * The "Saved" stamp.
 *
 * Deliberately understated: autosave is constant, so a loud confirmation every
 * few seconds would be maddening. It presses in like an ink stamp, sits for a
 * moment, and leaves.
 */
function SaveIndicator() {
  const state = useEditor((s) => s.saveState)
  if (state === 'idle') return null

  return (
    <span
      className="shrink-0 hidden sm:flex items-center gap-1.5 px-2 text-xs font-medium"
      role="status"
      aria-live="polite"
    >
      {state === 'saved' ? (
        <span className="flex items-center gap-1 text-sage-deep animate-stamp-in">
          <Icon name="check" size={15} />
          Saved
        </span>
      ) : (
        <span className="text-ink-faint">{state === 'saving' ? 'Saving…' : 'Unsaved'}</span>
      )}
    </span>
  )
}

function UndoRedo() {
  const past = useEditor((s) => s.past.length)
  const future = useEditor((s) => s.future.length)
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)

  return (
    <div className="flex">
      <button
        type="button"
        onClick={undo}
        disabled={past === 0}
        className="tap rounded-lg text-ink-soft hover:text-ink hover:bg-sunk disabled:opacity-30"
      >
        <Icon name="undo" size={20} title="Undo" />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={future === 0}
        className="tap rounded-lg text-ink-soft hover:text-ink hover:bg-sunk disabled:opacity-30"
      >
        <Icon name="redo" size={20} title="Redo" />
      </button>
    </div>
  )
}

/**
 * A canvas is opaque to assistive technology, so the page's contents are also
 * exposed as a real list. Each entry selects its element, which makes the
 * arrow-key nudging and the Inspector reachable without a pointer.
 */
function ElementList({ onEditText }: { onEditText: (id: string) => void }) {
  const elements = useEditor((s) => s.elements)
  const selectedId = useEditor((s) => s.selectedId)
  const select = useEditor((s) => s.select)

  const sorted = elements.slice().sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="sr-only-focusable fixed bottom-24 left-2 z-50 max-w-xs
      bg-surface border border-rule rounded-xl shadow-float p-2">
      <h2 className="text-sm font-semibold px-1 mb-1">
        Page contents ({elements.length})
      </h2>
      <p className="text-xs text-ink-soft px-1 mb-2">
        Arrow keys move the selected item. Shift moves further, Alt rotates.
        Enter edits text. Delete removes it.
      </p>
      <ul className="max-h-60 overflow-y-auto">
        {sorted.map((element, index) => (
          <li key={element.id}>
            <button
              type="button"
              aria-current={element.id === selectedId}
              onClick={() => select(element.id)}
              onDoubleClick={() => {
                if (element.type === 'text' || element.type === 'note') onEditText(element.id)
              }}
              className="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-sunk"
            >
              {`Layer ${sorted.length - index}: ${element.type} — ${describeElement(element)}`}
              {element.locked ? ' (locked)' : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
