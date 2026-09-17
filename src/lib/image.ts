import { uid } from './id'
import { getAsset, putAsset } from './db'
import {
  PHOTO_MAX_EDGE, PHOTO_QUALITY, THUMB_MAX_EDGE, THUMB_QUALITY,
} from './constants'
import type { Asset } from './types'

/**
 * Photo pipeline. Phone cameras hand us 4-12MB files; IndexedDB quota is
 * finite and shared. Everything is downscaled and re-encoded before it is ever
 * written, and a separate thumbnail is stored for grid views so the library
 * never decodes a full-size photo just to draw a 160px tile.
 */

/** Best encoder the browser will give us. WebP is ~25-30% smaller than JPEG. */
let cachedType: string | null = null
function encodeType(): string {
  if (cachedType) return cachedType
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  cachedType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg'
  return cachedType
}

function fitWithin(w: number, h: number, maxEdge: number): [number, number] {
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))]
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // `from-image` applies EXIF rotation so portrait phone shots aren't sideways.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch { /* fall through to the <img> path */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not decode that image.'))
      img.src = url
    })
    return img
  } finally {
    // Safe: the bitmap data is retained by the decoded <img>.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function drawTo(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  maxEdge: number,
): HTMLCanvasElement {
  const [w, h] = fitWithin(sw, sh, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, w, h)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed.'))),
      type,
      quality,
    )
  })
}

export interface ImportedImage {
  asset: Asset
  /** Natural aspect ratio, so callers can size an element before the blob loads. */
  ratio: number
}

/** Decode → downscale → re-encode → store. Returns the persisted asset. */
export async function importImage(file: Blob): Promise<ImportedImage> {
  const source = await decode(file)
  const sw = 'width' in source ? source.width : 0
  const sh = 'height' in source ? source.height : 0
  if (!sw || !sh) throw new Error('That file did not look like an image.')

  const type = encodeType()
  const full = drawTo(source, sw, sh, PHOTO_MAX_EDGE)
  const thumb = drawTo(source, sw, sh, THUMB_MAX_EDGE)
  const [blob, thumbBlob] = await Promise.all([
    toBlob(full, type, PHOTO_QUALITY),
    toBlob(thumb, 'image/jpeg', THUMB_QUALITY),
  ])
  if ('close' in source) source.close()

  const asset: Asset = {
    id: uid('a_'),
    blob,
    thumb: thumbBlob,
    width: full.width,
    height: full.height,
    bytes: blob.size + thumbBlob.size,
    createdAt: Date.now(),
  }
  await putAsset(asset)
  return { asset, ratio: full.width / full.height }
}

/* ------------------------------------------------------- object-url caching */

/**
 * Object URLs are a manual-memory API. We keep one URL per (asset, variant)
 * for the life of the tab: pages re-render constantly, and minting a fresh URL
 * each time is both slower and a genuine leak. `releaseObjectUrls` exists for
 * the wipe-all path.
 */
const urlCache = new Map<string, string>()

export function cacheObjectUrl(key: string, blob: Blob): string {
  const existing = urlCache.get(key)
  if (existing) return existing
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

export function peekObjectUrl(key: string): string | undefined {
  return urlCache.get(key)
}

export function releaseObjectUrl(key: string): void {
  const url = urlCache.get(key)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(key)
  }
}

export function releaseObjectUrls(): void {
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
}

export async function assetUrl(assetId: string, variant: 'full' | 'thumb' = 'full'): Promise<string | null> {
  const key = `${assetId}:${variant}`
  const cached = urlCache.get(key)
  if (cached) return cached
  const asset = await getAsset(assetId)
  if (!asset) return null
  return cacheObjectUrl(key, variant === 'thumb' ? asset.thumb : asset.blob)
}

/* ------------------------------------------------------ HTMLImageElement pool */

const imageCache = new Map<string, HTMLImageElement>()
const inflight = new Map<string, Promise<HTMLImageElement | null>>()
const svgCache = new Map<string, HTMLImageElement>()
const svgInflight = new Map<string, Promise<HTMLImageElement>>()

/**
 * Konva needs a decoded HTMLImageElement, not a URL. We pool them because a
 * page can reference the same photo more than once and because remounting the
 * editor shouldn't re-decode anything.
 */
/**
 * Synchronous cache peek.
 *
 * The React hooks seed their initial state from this, which matters twice:
 * re-opening a page shows its photos on the first paint instead of flashing
 * empty, and the offscreen export renderer can guarantee everything is decoded
 * *before* it renders, so a captured page is never missing an image.
 */
export function peekAssetImage(assetId: string, variant: 'full' | 'thumb' = 'full'): HTMLImageElement | null {
  return imageCache.get(`${assetId}:${variant}`) ?? null
}

export function peekSvgImage(key: string): HTMLImageElement | null {
  return svgCache.get(key) ?? null
}

export function loadAssetImage(
  assetId: string,
  variant: 'full' | 'thumb' = 'full',
): Promise<HTMLImageElement | null> {
  const key = `${assetId}:${variant}`
  const ready = imageCache.get(key)
  if (ready) return Promise.resolve(ready)
  const pending = inflight.get(key)
  if (pending) return pending

  const task = (async () => {
    const url = await assetUrl(assetId, variant)
    if (!url) return null
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    try {
      await img.decode()
    } catch {
      // decode() rejects on some older engines even when the load succeeds.
      await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve })
    }
    // A broken <img> must never reach Konva: drawImage() on one throws
    // InvalidStateError, which aborts the whole layer draw and takes the canvas
    // down with it. Returning null instead lets the node render a placeholder.
    if (!img.naturalWidth) {
      console.warn('[pagebound] image failed to decode', assetId, variant)
      return null
    }
    imageCache.set(key, img)
    return img
  })().finally(() => inflight.delete(key))

  inflight.set(key, task)
  return task
}

/** Load an already-decoded image from a plain URL (used by export + covers). */
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${url}`))
    img.src = url
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Turn an SVG source string into a data URL Konva can use as an image. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Decoded <img> for an inline SVG string. Stickers, tape and shapes use this. */
export function loadSvgImage(key: string, svg: string): Promise<HTMLImageElement> {
  const ready = svgCache.get(key)
  if (ready) return Promise.resolve(ready)
  const pending = svgInflight.get(key)
  if (pending) return pending

  const task = (async () => {
    const img = new Image()
    img.decoding = 'async'
    img.src = svgToDataUrl(svg)
    try { await img.decode() } catch {
      await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve })
    }
    if (!img.naturalWidth) {
      console.warn('[pagebound] SVG failed to decode', key)
      throw new Error(`Could not rasterise ${key}`)
    }
    svgCache.set(key, img)
    return img
  })().finally(() => svgInflight.delete(key))

  svgInflight.set(key, task)
  return task
}
