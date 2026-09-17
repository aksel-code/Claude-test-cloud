import { useEffect, useState } from 'react'
import { loadAssetImage, loadSvgImage, peekAssetImage, peekSvgImage } from '@/lib/image'

/**
 * Konva draws HTMLImageElements, not URLs, so every image-backed node needs a
 * decoded element before it can paint. Both hooks return null on the first
 * render and the decoded image once it lands; the image pools in `lib/image`
 * mean a second element using the same photo or sticker is instant.
 */

export function useAssetImage(assetId: string | null, variant: 'full' | 'thumb' = 'full') {
  // Seed from the cache so an already-decoded photo paints on the first frame.
  const [image, setImage] = useState<HTMLImageElement | null>(
    () => (assetId ? peekAssetImage(assetId, variant) : null),
  )

  useEffect(() => {
    if (!assetId) { setImage(null); return }
    const cached = peekAssetImage(assetId, variant)
    if (cached) { setImage(cached); return }
    let live = true
    void loadAssetImage(assetId, variant).then((img) => { if (live) setImage(img) })
    return () => { live = false }
  }, [assetId, variant])

  return image
}

export function useSvgImage(key: string, svg: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(() => peekSvgImage(key))

  useEffect(() => {
    const cached = peekSvgImage(key)
    if (cached) { setImage(cached); return }
    let live = true
    void loadSvgImage(key, svg)
      .then((img) => { if (live) setImage(img) })
      .catch((error) => { console.warn('[pagebound] sticker/tape render failed', error) })
    return () => { live = false }
    // `key` is the cache identity; `svg` is derived from it, so keying on it
    // alone avoids re-decoding when a parent re-renders with an equal string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return image
}
