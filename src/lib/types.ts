/**
 * Pagebound data model.
 *
 * Everything here is stored verbatim in IndexedDB, so treat these as a
 * persisted schema: additive changes are free, renames and removals need a
 * migration in `db.ts`.
 *
 * Geometry convention: a page is a fixed PAGE_W x PAGE_H coordinate space
 * (see constants.ts). Elements are positioned by their CENTRE, which keeps
 * rotation intuitive and avoids re-deriving an offset on every transform.
 */

export const ELEMENT_TYPES = [
  'text',
  'photo',
  'sticker',
  'tape',
  'doodle',
  'note',
  'shape',
] as const
export type ElementType = (typeof ELEMENT_TYPES)[number]

export interface BaseElement {
  id: string
  type: ElementType
  /** Centre X in page coordinates. */
  x: number
  /** Centre Y in page coordinates. */
  y: number
  width: number
  height: number
  /** Degrees, clockwise. */
  rotation: number
  zIndex: number
  locked: boolean
  opacity: number
}

export type TextAlign = 'left' | 'center' | 'right'

export interface TextProps {
  text: string
  /** Key into content/fonts.ts, not a raw CSS family. */
  font: string
  fontSize: number
  color: string
  align: TextAlign
  lineHeight: number
  letterSpacing: number
}

export type PhotoFrame = 'polaroid' | 'torn' | 'rounded' | 'filmstrip' | 'none'

export interface PhotoProps {
  /** Key into the `assets` object store. */
  assetId: string
  frame: PhotoFrame
  /** Author-supplied alt text. Surfaced in the a11y layer and on export. */
  alt: string
  /** Only rendered by the polaroid frame. */
  caption: string
  /** 0 = untouched; higher warms the photo toward the page. */
  warmth: number
}

export interface StickerProps {
  packId: string
  stickerId: string
  /** Overrides the sticker's own palette when the sticker opts in. */
  tint?: string
}

export interface TapeProps {
  patternId: string
  color: string
}

export type DoodleTool = 'pen' | 'marker' | 'highlighter'

export interface DoodleProps {
  tool: DoodleTool
  color: string
  size: number
  /** Flat [x0,y0,x1,y1,...] in element-local space, origin at top-left. */
  points: number[]
}

export type NoteStyle = 'sticky' | 'ticket' | 'receipt' | 'index'

export interface NoteProps {
  style: NoteStyle
  text: string
  font: string
  fontSize: number
  color: string
  /** Paper colour of the note itself. */
  paper: string
}

export type ShapeKind = 'line' | 'arrow' | 'circle' | 'star' | 'divider' | 'underline'

export interface ShapeProps {
  shape: ShapeKind
  color: string
  strokeWidth: number
}

export type ElementProps =
  | ({ type: 'text' } & TextProps)
  | ({ type: 'photo' } & PhotoProps)
  | ({ type: 'sticker' } & StickerProps)
  | ({ type: 'tape' } & TapeProps)
  | ({ type: 'doodle' } & DoodleProps)
  | ({ type: 'note' } & NoteProps)
  | ({ type: 'shape' } & ShapeProps)

export type TextElement = BaseElement & { type: 'text'; props: TextProps }
export type PhotoElement = BaseElement & { type: 'photo'; props: PhotoProps }
export type StickerElement = BaseElement & { type: 'sticker'; props: StickerProps }
export type TapeElement = BaseElement & { type: 'tape'; props: TapeProps }
export type DoodleElement = BaseElement & { type: 'doodle'; props: DoodleProps }
export type NoteElement = BaseElement & { type: 'note'; props: NoteProps }
export type ShapeElement = BaseElement & { type: 'shape'; props: ShapeProps }

export type PageElement =
  | TextElement
  | PhotoElement
  | StickerElement
  | TapeElement
  | DoodleElement
  | NoteElement
  | ShapeElement

export type BackgroundKind =
  | 'cream'
  | 'dotted'
  | 'lined'
  | 'grid'
  | 'kraft'
  | 'watercolor'
  | 'custom'

export interface PageBackground {
  kind: BackgroundKind
  /** Base paper colour. `custom` uses this alone. */
  color: string
  /** Ink colour of the rule/dot/grid pattern. */
  patternColor?: string
}

export type MoodId = 'bright' | 'calm' | 'meh' | 'heavy' | 'stormy'

export interface Page {
  id: string
  journalId: string
  /** Local calendar day, `YYYY-MM-DD`. The page's identity in the calendar. */
  date: string
  title: string
  background: PageBackground
  mood: MoodId | null
  tags: string[]
  elements: PageElement[]
  createdAt: number
  updatedAt: number
}

export type CoverStyle =
  | 'fabric'
  | 'kraft'
  | 'leather'
  | 'pastel'
  | 'linen'
  | 'marble'
  | 'photo'

export interface Journal {
  id: string
  title: string
  coverStyle: CoverStyle
  /** Accent colour; drives the cover tint and the spine. */
  color: string
  /** Asset id, only for coverStyle === 'photo'. */
  coverImage: string | null
  createdAt: number
  updatedAt: number
  pageIds: string[]
  archived: boolean
}

export interface Asset {
  id: string
  blob: Blob
  /** Small JPEG used by grids and the calendar. */
  thumb: Blob
  width: number
  height: number
  bytes: number
  createdAt: number
}

/** Rendered page preview, kept out of the Page record so page reads stay cheap. */
export interface PageThumb {
  pageId: string
  journalId: string
  blob: Blob
  updatedAt: number
}

export type ThemeSetting = 'light' | 'dark' | 'system'

export interface Settings {
  theme: ThemeSetting
  snapEnabled: boolean
  showSnapGuides: boolean
  reduceMotion: boolean | null
  hapticsEnabled: boolean
  weatherEnabled: boolean
  promptsEnabled: boolean
  lastPromptIndex: number
  /** `YYYY-MM-DD` of the most recent day with an edited page. */
  lastEntryDate: string | null
  streak: number
  bestStreak: number
  seedVersion: number
  onboarded: boolean
}

export interface LockConfig {
  /** null = no lock configured. */
  passcodeHash: string | null
  salt: string | null
  /** WebAuthn credential id (base64url), when biometric unlock is enrolled. */
  credentialId: string | null
}
