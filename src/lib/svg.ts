import { hashString } from './id'

/**
 * SVG `id`s are document-scoped, and "the document" is whatever the SVG ends up
 * inside. Two generated SVGs that both define `<pattern id="p">` and reference
 * `url(#p)` will silently both resolve to the *first* one the moment they are
 * inlined into the same page — every tape renders as stripes, every paper as
 * dots. Data-URL images dodge it, but inline usage (thumbnails, the pickers,
 * SSR of any kind) does not.
 *
 * So every generated document namespaces its ids by a hash of its own defining
 * inputs: stable across calls, so caching still works, and unique per distinct
 * SVG.
 */
export function svgScope(...parts: (string | number)[]): string {
  return hashString(parts.join('|')).toString(36).slice(0, 6)
}
