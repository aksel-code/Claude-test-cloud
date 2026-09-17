/**
 * Stub for jsPDF's optional peer dependencies.
 *
 * jsPDF lazily imports html2canvas, dompurify and canvg to support `.html()`
 * — a feature Pagebound doesn't use, since pages are rendered by Konva and
 * handed to jsPDF as images. Left alone they add ~430KB to the bundle, which
 * Workbox then precaches, so every offline install pays for code that can
 * never run. Aliasing them to this no-op keeps the service worker lean.
 *
 * If `.html()` is ever needed, remove the aliases in vite.config.ts.
 */
export default {}
