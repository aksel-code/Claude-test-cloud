/** Page coordinate space. Every element position is in these units. */
export const PAGE_W = 1080
export const PAGE_H = 1440
export const PAGE_RATIO = PAGE_W / PAGE_H

/** Undo ring buffer depth. Spec floor is 30; headroom costs almost nothing. */
export const HISTORY_LIMIT = 60

/** How far (in page units) an edge must be from a guide before it snaps. */
export const SNAP_THRESHOLD = 12

/** Newly placed elements get a deterministic tilt inside +/- this many degrees. */
export const HANDMADE_TILT = 3

export const MIN_ELEMENT_SIZE = 24

/** Largest edge we keep for a stored photo, and the JPEG quality we store at. */
export const PHOTO_MAX_EDGE = 2000
export const PHOTO_QUALITY = 0.82
export const THUMB_MAX_EDGE = 360
export const THUMB_QUALITY = 0.7

/** Page previews rendered for the library / calendar grids. */
export const PAGE_THUMB_WIDTH = 420

export const AUTOSAVE_DEBOUNCE_MS = 550

export const PALETTE = {
  cream: '#FAF6EE',
  ink: '#2B2A28',
  terracotta: '#C8674A',
  sage: '#8FA58A',
  dusty: '#7D98B3',
  mustard: '#D9A441',
} as const

/** Ink colours offered for text, doodles and shapes. */
export const INK_SWATCHES = [
  '#2B2A28',
  '#5A544C',
  '#C8674A',
  '#A44C32',
  '#8FA58A',
  '#5A7257',
  '#7D98B3',
  '#4A6986',
  '#D9A441',
  '#8C6414',
  '#8E6E9E',
  '#FFFDF8',
] as const

/** Paper / fill colours for notes, tape and custom backgrounds. */
export const PAPER_SWATCHES = [
  '#FAF6EE',
  '#F6E7C6',
  '#F2DCC4',
  '#E8DFCD',
  '#D9E2D6',
  '#CFDDE8',
  '#F5D5CA',
  '#E9D8E6',
  '#FDF3B8',
  '#D8CFC0',
  '#2B2A28',
  '#3E4A57',
] as const

export const TAGS_SUGGESTED = [
  'travel', 'family', 'food', 'work', 'friends',
  'nature', 'books', 'music', 'health', 'goals',
] as const
