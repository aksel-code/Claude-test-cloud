import { getMeta, putAsset, putJournal, putPage, setMeta } from './db'
import { uid } from './id'
import { addDays, todayKey } from './date'
import { PAGE_H, PAGE_W } from './constants'
import {
  createDoodle, createNote, createPhoto, createShape, createSticker, createTape, createText,
} from './elements'
import type { Asset, Journal, Page, PageElement } from './types'

/**
 * Demo content.
 *
 * Seeds one journal with three pages, each built to show a different corner of
 * the editor: photos and tape, travel ephemera, and notes and doodles. It runs
 * once on an empty database and never again, and it's plainly labelled as a
 * sample so nobody mistakes it for their own writing.
 *
 * The photographs are generated, not bundled: shipping stock imagery would mean
 * licensing questions and a megabyte of assets, and abstract washes read
 * perfectly well as "a photo went here" in a demo.
 */

const SEED_VERSION = 1

/* ------------------------------------------------------- generated imagery */

interface Scene {
  name: string
  alt: string
  svg: string
}

const SCENES: Scene[] = [
  {
    name: 'evening',
    alt: 'A generated sample image: an orange and pink evening sky over dark hills.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7D98B3"/><stop offset="42%" stop-color="#E4A9A0"/>
          <stop offset="72%" stop-color="#D9A441"/><stop offset="100%" stop-color="#C8674A"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#sky)"/>
      <circle cx="600" cy="700" r="92" fill="#FBE6C0" opacity=".9"/>
      <path d="M0 880q180-120 330-40t250-30 320 70v320H0Z" fill="#6F5236" opacity=".85"/>
      <path d="M0 980q220-90 400-20t500-40v280H0Z" fill="#3E3128"/>
      <g fill="#2B2A28" opacity=".5">
        <path d="M120 900l16 80h-32ZM180 916l14 64h-28ZM760 890l18 90h-36Z"/>
      </g>
    </svg>`,
  },
  {
    name: 'green',
    alt: 'A generated sample image: overlapping green leaf shapes on a pale ground.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="#E9E5D4"/>
      <g opacity=".92">
        <ellipse cx="260" cy="300" rx="230" ry="130" fill="#8FA58A" transform="rotate(-28 260 300)"/>
        <ellipse cx="640" cy="230" rx="200" ry="110" fill="#5A7257" transform="rotate(16 640 230)"/>
        <ellipse cx="950" cy="420" rx="250" ry="140" fill="#A5BC9F" transform="rotate(-12 950 420)"/>
        <ellipse cx="420" cy="640" rx="270" ry="150" fill="#6E8C68" transform="rotate(8 420 640)"/>
        <ellipse cx="880" cy="740" rx="220" ry="120" fill="#8FA58A" transform="rotate(-20 880 740)"/>
      </g>
      <g stroke="#3E4A38" stroke-width="3" opacity=".35" fill="none">
        <path d="M60 330q200-60 400 20M420 560q260-40 480 40"/>
      </g>
    </svg>`,
  },
  {
    name: 'water',
    alt: 'A generated sample image: a blue-green sea meeting a pale sky.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#CFDDE8"/><stop offset="45%" stop-color="#F3EEE1"/>
          <stop offset="46%" stop-color="#7D98B3"/><stop offset="100%" stop-color="#3D5A72"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#sea)"/>
      <g stroke="#FBF7EF" stroke-width="5" opacity=".45" fill="none" stroke-linecap="round">
        <path d="M60 520q90-24 180 0t180 0 180 0 180 0 180 0"/>
        <path d="M0 620q110-30 220 0t220 0 220 0 220 0 220 0"/>
        <path d="M80 740q120-34 240 0t240 0 240 0 240 0"/>
      </g>
      <circle cx="980" cy="180" r="70" fill="#FBE6C0" opacity=".8"/>
    </svg>`,
  },
]

async function svgToAsset(scene: Scene): Promise<Asset | null> {
  try {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scene.svg)}`
    const image = new Image()
    image.src = url
    await image.decode()

    const draw = (maxEdge: number) => {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
      return canvas
    }

    const full = draw(1400)
    const thumb = draw(360)
    const [blob, thumbBlob] = await Promise.all([
      new Promise<Blob>((resolve, reject) =>
        full.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.86)),
      new Promise<Blob>((resolve, reject) =>
        thumb.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.7)),
    ])

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
    return asset
  } catch (error) {
    console.warn('[pagebound] could not generate a demo image', error)
    return null
  }
}

/** A hand-drawn-looking stroke along a path, for demo doodles. */
function squiggle(x0: number, y0: number, x1: number, y1: number, wobble: number, steps = 22): number[] {
  const points: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const nx = x0 + (x1 - x0) * t
    const ny = y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 3.2) * wobble
    points.push(nx, ny)
  }
  return points
}

/**
 * Tape across a photo's top corners.
 *
 * Centred *on* the corner and turned about 40 degrees, which is how tape
 * actually goes down — a strip centred on the corner but left horizontal just
 * hangs off the side, and one as wide as the photo reads as a banner.
 */
function cornerTape(
  photo: PageElement,
  patterns: string[],
  colors: string[],
): PageElement[] {
  const halfW = photo.width / 2
  const halfH = photo.height / 2
  const corners: [number, number][] = [[-1, -1], [1, -1]]
  return patterns.map((pattern, i) => {
    const [sx] = corners[i % corners.length]
    const strip = createTape(pattern, {
      x: photo.x + sx * (halfW - 8),
      y: photo.y - halfH + 10,
      width: Math.min(220, photo.width * 0.62),
      color: colors[i % colors.length],
      tilt: false,
    })
    strip.height = 62
    strip.rotation = sx * -42
    return strip
  })
}

function place<T extends PageElement>(element: T, z: number): T {
  return { ...element, zIndex: z }
}

/* ---------------------------------------------------------------- the seed */

export async function seedIfNeeded(): Promise<void> {
  const version = await getMeta<number>('seedVersion')
  if (version && version >= SEED_VERSION) return

  // Only seed a genuinely empty library — never push demo content at someone
  // who already has journals of their own.
  const existing = await getMeta<boolean>('hasContent')
  if (existing) { await setMeta('seedVersion', SEED_VERSION); return }

  try {
    const [evening, green, water] = await Promise.all(SCENES.map(svgToAsset))
    const now = Date.now()

    const journal: Journal = {
      id: uid('j_'),
      title: 'A sample journal',
      coverStyle: 'linen',
      color: '#D9CFBE',
      coverImage: null,
      createdAt: now,
      updatedAt: now,
      pageIds: [],
      archived: false,
    }

    const pages: Page[] = [
      buildSlowSaturday(journal.id, evening),
      buildLisbon(journal.id, water),
      buildLists(journal.id, green),
    ]

    journal.pageIds = pages.map((p) => p.id)
    await putJournal(journal)
    await Promise.all(pages.map(putPage))
    await setMeta('seedVersion', SEED_VERSION)
    await setMeta('hasContent', true)
  } catch (error) {
    console.error('[pagebound] seeding failed', error)
    // A failed seed must never block the app; the user just gets an empty shelf.
    await setMeta('seedVersion', SEED_VERSION)
  }
}

/** Page one: a photo, taped down, with handwriting. The core loop. */
function buildSlowSaturday(journalId: string, photo: Asset | null): Page {
  const elements: PageElement[] = []
  let z = 0

  elements.push(place(createText('Saturday', {
    x: 300, y: 170, font: 'homemade', fontSize: 66, color: '#2B2A28',
  }), z++))
  elements.push(place(createText('nowhere to be', {
    x: 336, y: 250, font: 'caveat', fontSize: 40, color: '#8A8377',
  }), z++))
  elements.push(place(createShape('underline', {
    x: 300, y: 300, color: '#C8674A', strokeWidth: 6,
  }), z++))

  if (photo) {
    const frame = createPhoto(photo.id, photo.width / photo.height, {
      x: 560, y: 660, frame: 'polaroid',
      alt: SCENES[0].alt,
    })
    frame.props.caption = 'the sky did that thing again'
    elements.push(place(frame, z++))
    for (const strip of cornerTape(frame, ['stripe', 'plain'], ['#C8674A', '#E8D9B8'])) {
      elements.push(place(strip, z++))
    }
  }

  elements.push(place(createSticker('food', 'coffee', { x: 175, y: 690, size: 190 }), z++))
  elements.push(place(createSticker('nature', 'leaf', { x: 930, y: 420, size: 150 }), z++))

  const blurb = createText(
    'Two cups before noon.\nRead half a chapter, fell asleep,\nread it again.\n\nNothing happened. It was excellent.',
    { x: 540, y: 1180, font: 'patrick', fontSize: 40, color: '#2B2A28', align: 'center' },
  )
  blurb.width = 760
  elements.push(place(blurb, z++))

  const doodle = createDoodle(squiggle(180, 1330, 900, 1350, 9), 'marker', '#8FA58A', 7)
  if (doodle) elements.push(place(doodle, z++))

  return page(journalId, addDays(todayKey(), -2), 'A slow Saturday', elements, {
    kind: 'kraft', color: '#D8C3A0', patternColor: '#8A6C4C',
  }, 'calm', ['rest', 'home'])
}

/** Page two: travel ephemera — torn photo, ticket stub, stickers over tape. */
function buildLisbon(journalId: string, photo: Asset | null): Page {
  const elements: PageElement[] = []
  let z = 0

  elements.push(place(createText('Lisbon', {
    x: 320, y: 165, font: 'fraunces', fontSize: 78, color: '#2B2A28',
  }), z++))
  elements.push(place(createText('day three', {
    x: 300, y: 248, font: 'inter', fontSize: 30, color: '#7C7469', letterSpacing: 6,
  }), z++))

  if (photo) {
    const frame = createPhoto(photo.id, photo.width / photo.height, {
      x: 570, y: 560, frame: 'torn', alt: SCENES[2].alt,
    })
    frame.width = 640
    frame.height = 480
    elements.push(place(frame, z++))
    for (const strip of cornerTape(frame, ['gingham'], ['#7D98B3'])) {
      elements.push(place(strip, z++))
    }
  }

  const ticket = createNote('ticket', { x: 620, y: 930 })
  ticket.props.text = 'ELEVADOR DA BICA\n· one way ·'
  ticket.props.font = 'inter'
  ticket.props.fontSize = 28
  elements.push(place(ticket, z++))

  elements.push(place(createSticker('travel', 'pin', { x: 180, y: 520, size: 170, tint: '#C8674A' }), z++))
  elements.push(place(createSticker('labels', 'stamp', { x: 920, y: 200, size: 165 }), z++))
  elements.push(place(createSticker('food', 'croissant', { x: 210, y: 1000, size: 175 }), z++))

  const note = createText(
    'Got lost twice on purpose. Ate three custard\ntarts and regret none of them.\nThe tram smells like hot brakes and oranges.',
    { x: 540, y: 1190, font: 'kalam', fontSize: 36, color: '#2B2A28', align: 'center' },
  )
  note.width = 820
  elements.push(place(note, z++))

  elements.push(place(createShape('divider', {
    x: 540, y: 1355, color: '#D9A441', strokeWidth: 5,
  }), z++))

  return page(journalId, addDays(todayKey(), -9), 'Lisbon, day three', elements, {
    kind: 'watercolor', color: '#FBF7F0', patternColor: '#8FA58A',
  }, 'bright', ['travel', 'food'])
}

/** Page three: notes, doodles and shapes — the scrappier half of the toolbox. */
function buildLists(journalId: string, photo: Asset | null): Page {
  const elements: PageElement[] = []
  let z = 0

  elements.push(place(createText('small things', {
    x: 340, y: 160, font: 'caveat', fontSize: 68, color: '#5A7257',
  }), z++))

  const sticky = createNote('sticky', { x: 270, y: 470 })
  sticky.props.text = 'buy:\n· lemons\n· stamps\n· more tape'
  elements.push(place(sticky, z++))

  const card = createNote('index', { x: 720, y: 430 })
  card.props.text = 'What made you smile today?'
  card.props.font = 'kalam'
  elements.push(place(card, z++))

  const receipt = createNote('receipt', { x: 250, y: 900 })
  receipt.props.text = 'market\n—\ntomatoes  2.40\nbread     3.10\nflowers   4.00\n—\n         9.50'
  receipt.props.fontSize = 26
  elements.push(place(receipt, z++))

  if (photo) {
    const frame = createPhoto(photo.id, photo.width / photo.height, {
      x: 730, y: 880, frame: 'rounded', alt: SCENES[1].alt,
    })
    frame.width = 440
    frame.height = 330
    elements.push(place(frame, z++))
    const top = createTape('floral', { x: frame.x, y: frame.y - frame.height / 2, width: 210 })
    top.rotation = -4
    elements.push(place(top, z++))
  }

  elements.push(place(createSticker('doodles', 'arrow-curve', {
    x: 480, y: 620, size: 150, tint: '#C8674A',
  }), z++))
  elements.push(place(createSticker('moods', 'sparkle', {
    x: 900, y: 230, size: 130, tint: '#D9A441',
  }), z++))

  const scribble = createDoodle(squiggle(180, 1180, 560, 1210, 22, 30), 'pen', '#7D98B3', 6)
  if (scribble) elements.push(place(scribble, z++))

  const highlight = createDoodle(squiggle(640, 1180, 950, 1186, 4, 12), 'highlighter', '#D9A441', 42)
  if (highlight) elements.push(place(highlight, z++))

  elements.push(place(createText('keep noticing', {
    x: 540, y: 1330, font: 'gloria', fontSize: 44, color: '#2B2A28', align: 'center',
  }), z++))

  return page(journalId, addDays(todayKey(), -16), 'Lists & small things', elements, {
    kind: 'dotted', color: '#FAF6EE', patternColor: '#C0B5A0',
  }, 'meh', ['lists'])
}

function page(
  journalId: string,
  date: string,
  title: string,
  elements: PageElement[],
  background: Page['background'],
  mood: Page['mood'],
  tags: string[],
): Page {
  const created = Date.now() - Math.random() * 1000
  return {
    id: uid('p_'),
    journalId,
    date,
    title,
    background,
    mood,
    tags,
    elements: elements.map((el) => clampToPage(el)),
    createdAt: created,
    updatedAt: created,
  }
}

/** Keeps demo content on the page even if a size constant changes later. */
function clampToPage(element: PageElement): PageElement {
  return {
    ...element,
    x: Math.max(20, Math.min(PAGE_W - 20, element.x)),
    y: Math.max(20, Math.min(PAGE_H - 20, element.y)),
  }
}
