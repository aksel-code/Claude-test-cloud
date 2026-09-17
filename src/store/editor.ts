import { create } from 'zustand'
import { getPage, putPage, putThumb, releaseAssets, getJournal, putJournal } from '@/lib/db'
import { AUTOSAVE_DEBOUNCE_MS, HISTORY_LIMIT, MIN_ELEMENT_SIZE } from '@/lib/constants'
import { duplicateElement } from '@/lib/elements'
import { DEFAULT_BACKGROUND } from '@/content/papers'
import { useSettings } from './settings'
import type {
  MoodId, Page, PageBackground, PageElement,
} from '@/lib/types'

/** Which tool the toolbar has active. Drawing tools take over pointer input. */
export type EditorTool = 'select' | 'pen' | 'marker' | 'highlighter' | 'eraser'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved'

/** The slice of a page that undo/redo operates on. */
interface EditorDoc {
  elements: PageElement[]
  background: PageBackground
  mood: MoodId | null
  tags: string[]
  title: string
}

interface EditorState extends EditorDoc {
  pageId: string | null
  journalId: string | null
  date: string
  createdAt: number
  loading: boolean

  selectedId: string | null
  tool: EditorTool
  penColor: string
  penSize: number

  past: EditorDoc[]
  future: EditorDoc[]
  /** Suppresses snapshots inside a drag/resize gesture so it lands as one step. */
  inGesture: boolean

  saveState: SaveState
  /** Registered by the canvas so autosave can refresh the page thumbnail. */
  thumbnailProvider: (() => Promise<Blob | null>) | null

  load: (pageId: string) => Promise<void>
  reset: () => void

  addElement: (element: PageElement, opts?: { select?: boolean }) => void
  updateElement: (id: string, patch: Partial<PageElement>) => void
  /** Same as updateElement but records no undo step — for derived geometry. */
  updateQuiet: (id: string, patch: Partial<PageElement>) => void
  updateProps: (id: string, patch: Record<string, unknown>) => void
  removeElement: (id: string) => void
  duplicate: (id: string) => void
  setLocked: (id: string, locked: boolean) => void

  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void

  setBackground: (background: PageBackground) => void
  setMood: (mood: MoodId | null) => void
  setTags: (tags: string[]) => void
  setTitle: (title: string) => void

  select: (id: string | null) => void
  setTool: (tool: EditorTool) => void
  setPen: (patch: { color?: string; size?: number }) => void

  beginGesture: () => void
  endGesture: () => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  registerThumbnailProvider: (fn: (() => Promise<Blob | null>) | null) => void
  flush: () => Promise<void>
}

const EMPTY_DOC: EditorDoc = {
  elements: [],
  background: DEFAULT_BACKGROUND,
  mood: null,
  tags: [],
  title: '',
}

function docOf(state: EditorState): EditorDoc {
  return {
    elements: state.elements,
    background: state.background,
    mood: state.mood,
    tags: state.tags,
    title: state.title,
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let savedFlashTimer: ReturnType<typeof setTimeout> | null = null

export const useEditor = create<EditorState>((set, get) => {
  /**
   * Snapshot the current document before a change.
   *
   * Element objects are treated as immutable, so `past` entries share element
   * references with the live array — a 60-deep history of a 50-element page
   * costs a few hundred pointers, not 60 deep clones.
   */
  function snapshot() {
    const state = get()
    if (state.inGesture) return
    const past = [...state.past, docOf(state)]
    if (past.length > HISTORY_LIMIT) past.shift()
    set({ past, future: [] })
  }

  function markDirty() {
    set({ saveState: 'dirty' })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { void persist() }, AUTOSAVE_DEBOUNCE_MS)
  }

  async function persist() {
    const state = get()
    if (!state.pageId || !state.journalId) return
    set({ saveState: 'saving' })

    const page: Page = {
      id: state.pageId,
      journalId: state.journalId,
      date: state.date,
      title: state.title,
      background: state.background,
      mood: state.mood,
      tags: state.tags,
      elements: state.elements,
      createdAt: state.createdAt,
      updatedAt: Date.now(),
    }

    try {
      await putPage(page)

      // Bump the journal so the library's "recently worked on" order is honest.
      const journal = await getJournal(state.journalId)
      if (journal) {
        const pageIds = journal.pageIds.includes(page.id)
          ? journal.pageIds
          : [...journal.pageIds, page.id]
        await putJournal({ ...journal, pageIds, updatedAt: page.updatedAt })
      }

      useSettings.getState().recordEntry(state.date)

      // Thumbnail last: it's the slow part and the page record is what matters.
      const provider = get().thumbnailProvider
      if (provider) {
        const blob = await provider()
        if (blob) {
          await putThumb({
            pageId: page.id,
            journalId: page.journalId,
            blob,
            updatedAt: page.updatedAt,
          })
        }
      }

      set({ saveState: 'saved' })
      if (savedFlashTimer) clearTimeout(savedFlashTimer)
      savedFlashTimer = setTimeout(() => {
        if (get().saveState === 'saved') set({ saveState: 'idle' })
      }, 2200)
    } catch (error) {
      console.error('[pagebound] autosave failed', error)
      set({ saveState: 'dirty' })
    }
  }

  /** Re-densifies zIndex to 0..n-1 after a reorder, keeping array order canonical. */
  function normalise(elements: PageElement[]): PageElement[] {
    return elements
      .slice()
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((el, i) => (el.zIndex === i ? el : { ...el, zIndex: i }))
  }

  function reorder(id: string, move: (index: number, length: number) => number) {
    const state = get()
    const sorted = normalise(state.elements)
    const index = sorted.findIndex((el) => el.id === id)
    if (index < 0) return
    const target = Math.max(0, Math.min(sorted.length - 1, move(index, sorted.length)))
    if (target === index) return

    snapshot()
    const next = sorted.slice()
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    set({ elements: next.map((el, i) => ({ ...el, zIndex: i })) })
    markDirty()
  }

  return {
    ...EMPTY_DOC,
    pageId: null,
    journalId: null,
    date: '',
    createdAt: 0,
    loading: false,

    selectedId: null,
    tool: 'select',
    penColor: '#2B2A28',
    penSize: 8,

    past: [],
    future: [],
    inGesture: false,

    saveState: 'idle',
    thumbnailProvider: null,

    load: async (pageId) => {
      if (saveTimer) clearTimeout(saveTimer)
      set({ loading: true, pageId: null })
      const page = await getPage(pageId)
      if (!page) {
        set({ loading: false })
        return
      }
      set({
        pageId: page.id,
        journalId: page.journalId,
        date: page.date,
        createdAt: page.createdAt,
        elements: normalise(page.elements),
        background: page.background,
        mood: page.mood,
        tags: page.tags,
        title: page.title,
        past: [],
        future: [],
        selectedId: null,
        tool: 'select',
        saveState: 'idle',
        loading: false,
      })
    },

    reset: () => {
      if (saveTimer) clearTimeout(saveTimer)
      set({
        ...EMPTY_DOC,
        pageId: null, journalId: null, date: '', createdAt: 0,
        past: [], future: [], selectedId: null, tool: 'select',
        saveState: 'idle', thumbnailProvider: null, inGesture: false,
      })
    },

    addElement: (element, opts) => {
      snapshot()
      const elements = get().elements
      const top = elements.reduce((max, el) => Math.max(max, el.zIndex), -1) + 1
      const placed = { ...element, zIndex: top } as PageElement
      set({
        elements: [...elements, placed],
        selectedId: opts?.select === false ? get().selectedId : placed.id,
      })
      markDirty()
    },

    updateElement: (id, patch) => {
      snapshot()
      set({
        elements: get().elements.map((el) => {
          if (el.id !== id) return el
          const next = { ...el, ...patch } as PageElement
          // Guard against transform handles collapsing an element to nothing.
          next.width = Math.max(MIN_ELEMENT_SIZE, next.width)
          next.height = Math.max(MIN_ELEMENT_SIZE, next.height)
          return next
        }),
      })
      markDirty()
    },

    // Text blocks measure their own height once Konva has laid them out. That
    // is a consequence of the user's edit, not an edit of its own, so it must
    // not land in the undo stack — otherwise every Ctrl+Z eats a resize.
    updateQuiet: (id, patch) => {
      set({
        elements: get().elements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as PageElement) : el,
        ),
      })
      markDirty()
    },

    updateProps: (id, patch) => {
      snapshot()
      set({
        elements: get().elements.map((el) =>
          el.id === id ? ({ ...el, props: { ...el.props, ...patch } } as PageElement) : el,
        ),
      })
      markDirty()
    },

    removeElement: (id) => {
      const target = get().elements.find((el) => el.id === id)
      snapshot()
      set({
        elements: get().elements.filter((el) => el.id !== id),
        selectedId: get().selectedId === id ? null : get().selectedId,
      })
      markDirty()
      // Photos removed from the page may now be unreferenced. Undo re-adds the
      // element, and the asset is only actually dropped once nothing points at
      // it — so this stays correct even across an undo.
      if (target?.type === 'photo') {
        void releaseAssets([target.props.assetId])
      }
    },

    duplicate: (id) => {
      const source = get().elements.find((el) => el.id === id)
      if (!source) return
      get().addElement(duplicateElement(source))
    },

    setLocked: (id, locked) => {
      get().updateElement(id, { locked })
      if (locked && get().selectedId === id) set({ selectedId: null })
    },

    bringForward: (id) => reorder(id, (i) => i + 1),
    sendBackward: (id) => reorder(id, (i) => i - 1),
    bringToFront: (id) => reorder(id, (_i, len) => len - 1),
    sendToBack: (id) => reorder(id, () => 0),

    setBackground: (background) => { snapshot(); set({ background }); markDirty() },
    setMood: (mood) => { snapshot(); set({ mood }); markDirty() },
    setTags: (tags) => { snapshot(); set({ tags }); markDirty() },
    setTitle: (title) => { snapshot(); set({ title }); markDirty() },

    select: (id) => set({ selectedId: id }),
    setTool: (tool) => set({ tool, selectedId: tool === 'select' ? get().selectedId : null }),
    setPen: (patch) => set(patch as Partial<EditorState>),

    beginGesture: () => {
      if (get().inGesture) return
      snapshot()
      set({ inGesture: true })
    },
    endGesture: () => set({ inGesture: false }),

    undo: () => {
      const state = get()
      const previous = state.past.at(-1)
      if (!previous) return
      set({
        ...previous,
        past: state.past.slice(0, -1),
        future: [docOf(state), ...state.future].slice(0, HISTORY_LIMIT),
        selectedId: previous.elements.some((el) => el.id === state.selectedId)
          ? state.selectedId
          : null,
      })
      markDirty()
    },

    redo: () => {
      const state = get()
      const next = state.future[0]
      if (!next) return
      set({
        ...next,
        past: [...state.past, docOf(state)].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        selectedId: next.elements.some((el) => el.id === state.selectedId)
          ? state.selectedId
          : null,
      })
      markDirty()
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    registerThumbnailProvider: (fn) => set({ thumbnailProvider: fn }),

    flush: async () => {
      if (saveTimer) clearTimeout(saveTimer)
      if (get().saveState === 'dirty' || get().saveState === 'saving') await persist()
    },
  }
})

/** Selector helper — the currently selected element, or null. */
export function useSelectedElement(): PageElement | null {
  return useEditor((s) => s.elements.find((el) => el.id === s.selectedId) ?? null)
}
