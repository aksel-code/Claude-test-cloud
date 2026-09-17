/**
 * Built-in sticker packs.
 *
 * Every sticker is an inline SVG on a 100x100 canvas: crisp at any zoom, a few
 * hundred bytes each, no licensing questions, and trivially extensible — see
 * `registerStickerPack` at the bottom and the "Adding a sticker pack" section
 * of the README.
 *
 * House style: flat shapes, a warm muted palette, visible hand-drawn wobble.
 * Nothing is perfectly symmetrical on purpose.
 */

export interface Sticker {
  id: string
  name: string
  /** Free-text keywords for the sticker search box. */
  tags: string[]
  /** Intrinsic width / height. Almost everything here is square. */
  ratio: number
  /** Inner SVG markup, drawn on a 0 0 100 100 viewBox. */
  body: string
  /** When true, the tint control replaces `currentColor` in the body. */
  tintable: boolean
}

export interface StickerPack {
  id: string
  name: string
  /** One line shown under the pack name in the picker. */
  blurb: string
  stickers: Sticker[]
}

/* Palette shorthand, so the shape data below stays readable. */
const T = '#C8674A' // terracotta
const TD = '#A44C32'
const S = '#8FA58A' // sage
const SD = '#5A7257'
const B = '#7D98B3' // dusty blue
const BD = '#4A6986'
const M = '#D9A441' // mustard
const I = '#2B2A28' // ink
const C = '#FBF7EF' // cream
const K = '#A47B56' // kraft brown
const KD = '#6F5236'
const P = '#E4A9A0' // blush

type StickerInit = Omit<Sticker, 'ratio' | 'tintable'> & { ratio?: number; tintable?: boolean }

function s(init: StickerInit): Sticker {
  return { ratio: 1, tintable: false, ...init }
}

/* ------------------------------------------------------------------ nature */

const nature: Sticker[] = [
  s({
    id: 'leaf', name: 'Leaf', tags: ['plant', 'green', 'autumn'],
    body: `<path d="M50 88C22 76 14 44 26 20c26-4 52 10 56 34 2 22-14 34-32 34Z" fill="${S}"/>
      <path d="M50 86C44 62 38 38 28 22" stroke="${SD}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M46 62 62 50M44 48 58 38M42 34 52 28" stroke="${SD}" stroke-width="2.4" stroke-linecap="round"/>`,
  }),
  s({
    id: 'fern', name: 'Fern', tags: ['plant', 'frond', 'green'],
    ratio: 0.8,
    body: `<path d="M52 96q-6-40 -2-56T62 10" stroke="${SD}" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${Array.from({ length: 9 }, (_, i) => {
        const p = i / 8
        const y = 84 - i * 9
        const x = 52 - p * 12
        const len = 26 * (1 - p * 0.78) + 4
        const lift = 8 + p * 5
        return `<path d="M${x.toFixed(1)} ${y}q-${(len * 0.6).toFixed(1)} -2 -${len.toFixed(1)} -${lift}" stroke="${S}" stroke-width="${(5.4 - p * 2.4).toFixed(1)}" fill="none" stroke-linecap="round"/>
                <path d="M${x.toFixed(1)} ${y}q${(len * 0.6).toFixed(1)} -2 ${len.toFixed(1)} -${lift}" stroke="${S}" stroke-width="${(5.4 - p * 2.4).toFixed(1)}" fill="none" stroke-linecap="round"/>`
      }).join('')}`,
  }),
  s({
    id: 'mushroom', name: 'Mushroom', tags: ['forest', 'toadstool', 'fungi'],
    body: `<path d="M14 50c0-22 16-34 36-34s36 12 36 34c0 6-72 6-72 0Z" fill="${T}"/>
      <circle cx="34" cy="36" r="6" fill="${C}"/><circle cx="58" cy="28" r="4.6" fill="${C}"/>
      <circle cx="68" cy="42" r="5" fill="${C}"/>
      <path d="M38 50h24c2 18 4 30-2 36H40c-6-6-4-18-2-36Z" fill="#EBD9BE"/>
      <path d="M44 54v28M56 54v28" stroke="${KD}" stroke-width="1.8" opacity=".35"/>`,
  }),
  s({
    id: 'sun', name: 'Sun', tags: ['weather', 'warm', 'day'],
    body: `<circle cx="50" cy="50" r="22" fill="${M}"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const r1 = 30 + (i % 3) * 1.6
        const r2 = 42 + (i % 2) * 2.4
        return `<line x1="${(50 + Math.cos(a) * r1).toFixed(1)}" y1="${(50 + Math.sin(a) * r1).toFixed(1)}"
          x2="${(50 + Math.cos(a) * r2).toFixed(1)}" y2="${(50 + Math.sin(a) * r2).toFixed(1)}"
          stroke="${M}" stroke-width="4.4" stroke-linecap="round"/>`
      }).join('')}`,
  }),
  s({
    id: 'cloud', name: 'Cloud', tags: ['weather', 'sky', 'soft'],
    ratio: 1.35,
    body: `<path d="M24 70c-12 0-18-8-16-17 2-8 9-12 15-11 2-14 14-22 26-20 11 2 18 10 19 20 9-1 16 5 16 14s-7 14-16 14Z" fill="${C}" stroke="${B}" stroke-width="3.2" stroke-linejoin="round"/>`,
  }),
  s({
    id: 'moon', name: 'Moon', tags: ['night', 'sleep', 'sky'],
    body: `<path d="M62 12a40 40 0 1 0 26 62A34 34 0 0 1 62 12Z" fill="${M}"/>
      <circle cx="72" cy="30" r="3" fill="${C}" opacity=".7"/>
      <circle cx="80" cy="46" r="2" fill="${C}" opacity=".6"/>`,
  }),
  s({
    id: 'mountain', name: 'Mountain', tags: ['hike', 'peak', 'outdoors'],
    ratio: 1.25,
    body: `<path d="M6 82 36 30l18 28 12-16 28 40Z" fill="${B}"/>
      <path d="M36 30l10 16H26Z" fill="${C}"/>
      <path d="M66 42l8 11H58Z" fill="${C}" opacity=".85"/>
      <path d="M6 82h88" stroke="${BD}" stroke-width="3" stroke-linecap="round"/>`,
  }),
  s({
    id: 'wave', name: 'Wave', tags: ['sea', 'ocean', 'water'],
    ratio: 1.5,
    body: `<path d="M4 62q14-20 26 0t26 0 26 0 14-8" stroke="${B}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M4 78q14-20 26 0t26 0 26 0 14-8" stroke="${BD}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`,
  }),
  s({
    id: 'flower', name: 'Flower', tags: ['bloom', 'petal', 'spring'],
    body: `${Array.from({ length: 6 }, (_, i) => {
      const a = i * 60
      return `<ellipse cx="50" cy="28" rx="11" ry="17" fill="${P}" transform="rotate(${a} 50 50)"/>`
    }).join('')}
      <circle cx="50" cy="50" r="10" fill="${M}"/>`,
  }),
  s({
    id: 'pinecone', name: 'Pine cone', tags: ['forest', 'winter', 'brown'],
    ratio: 0.72,
    body: `<path d="M50 96C36 82 30 60 30 42 30 24 38 8 50 4c12 4 20 20 20 38 0 18-6 40-20 54Z" fill="${KD}"/>
      ${[
        [50, 18, 11], [38, 30, 11], [62, 30, 11], [50, 42, 12],
        [36, 54, 12], [64, 54, 12], [50, 66, 12], [42, 78, 10], [58, 78, 10], [50, 88, 8],
      ].map(([x, y, r], i) =>
        `<path d="M${x - r} ${y}q${r} -${r * 0.85} ${r * 2} 0q-${r} ${r * 0.55} -${r * 2} 0Z" fill="${i % 2 ? K : '#B98B62'}" stroke="${KD}" stroke-width="1.2"/>`,
      ).join('')}`,
  }),
  s({
    id: 'bird', name: 'Little bird', tags: ['animal', 'sparrow', 'sky'],
    ratio: 1.25,
    body: `<path d="M8 40 30 56 12 72Z" fill="${BD}"/>
      <ellipse cx="52" cy="54" rx="30" ry="24" fill="${B}"/>
      <path d="M38 48q16 14 34 6-4 16-20 16t-14-22Z" fill="${BD}" opacity=".45"/>
      <circle cx="70" cy="44" r="3.4" fill="${I}"/>
      <path d="M80 50 96 54 80 60Z" fill="${M}"/>
      <path d="M46 76l-4 12M60 78l2 12" stroke="${M}" stroke-width="3.4" stroke-linecap="round"/>`,
  }),
  s({
    id: 'star', name: 'Star', tags: ['night', 'sparkle', 'favourite'],
    tintable: true,
    body: `<path d="M50 8l12 28 30 3-22 21 6 30-26-15-26 15 6-30-22-21 30-3Z" fill="currentColor"/>`,
  }),
]

/* -------------------------------------------------------------------- food */

const food: Sticker[] = [
  s({
    id: 'coffee', name: 'Coffee', tags: ['drink', 'cafe', 'morning'],
    body: `<path d="M22 34h50v30c0 14-10 22-25 22s-25-8-25-22Z" fill="${C}" stroke="${KD}" stroke-width="3"/>
      <path d="M24 42h44v18c0 10-8 16-22 16s-22-6-22-16Z" fill="${KD}"/>
      <path d="M72 44h8a10 10 0 0 1 0 20h-8" fill="none" stroke="${KD}" stroke-width="3.4"/>
      <path d="M38 22q4-8 0-14M50 22q4-8 0-14M62 22q4-8 0-14" stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,
  }),
  s({
    id: 'croissant', name: 'Croissant', tags: ['bakery', 'breakfast', 'pastry'],
    ratio: 1.3,
    body: `<path d="M12 68q10-32 38-34t38 34q-14-10-24-4t-14 8-14-8-24 4Z" fill="${M}"/>
      <path d="M36 40q6 16 4 26M52 34q0 18-2 28M66 40q-6 16-4 26" stroke="#B9862E" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  }),
  s({
    id: 'cherry', name: 'Cherries', tags: ['fruit', 'summer', 'red'],
    body: `<path d="M50 18q-8 24-22 36M50 18q10 22 20 32" stroke="${SD}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M50 18q10-10 22-6" stroke="${S}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="28" cy="64" r="16" fill="${T}"/><circle cx="70" cy="58" r="14" fill="${TD}"/>
      <circle cx="23" cy="58" r="4" fill="${C}" opacity=".55"/>`,
  }),
  s({
    id: 'avocado', name: 'Avocado', tags: ['green', 'toast', 'lunch'],
    body: `<path d="M50 90c-18 0-28-16-28-34S34 12 50 12s28 26 28 44-10 34-28 34Z" fill="${SD}"/>
      <path d="M50 82c-12 0-20-12-20-26s8-32 20-32 20 18 20 32-8 26-20 26Z" fill="#C4D19A"/>
      <ellipse cx="50" cy="56" rx="12" ry="14" fill="${K}"/>`,
  }),
  s({
    id: 'ramen', name: 'Ramen', tags: ['noodles', 'dinner', 'bowl'],
    ratio: 1.15,
    body: `<path d="M14 48h72c0 24-16 38-36 38S14 72 14 48Z" fill="${C}" stroke="${T}" stroke-width="3.4"/>
      <path d="M18 56h64" stroke="${T}" stroke-width="3" opacity=".6"/>
      <path d="M30 44q6-12 16-6M52 42q8-12 16-4" stroke="${M}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      <circle cx="42" cy="60" r="7" fill="#F6E7C6" stroke="${M}" stroke-width="2.4"/>
      <rect x="56" y="54" width="16" height="10" rx="2" fill="${SD}"/>
      <path d="M62 28l26-12" stroke="${KD}" stroke-width="3.2" stroke-linecap="round"/>`,
  }),
  s({
    id: 'cake', name: 'Cake', tags: ['birthday', 'sweet', 'celebrate'],
    body: `<path d="M20 52h60v30c0 4-2 6-6 6H26c-4 0-6-2-6-6Z" fill="#F3D9C4"/>
      <path d="M20 52h60v12q-8 8-15 0t-15 0-15 0-15 0Z" fill="${P}"/>
      <rect x="47" y="26" width="6" height="22" rx="3" fill="${C}" stroke="${T}" stroke-width="2"/>
      <path d="M50 26q6-6 0-12-6 6 0 12Z" fill="${M}"/>
      <circle cx="34" cy="74" r="3" fill="${T}"/><circle cx="52" cy="78" r="3" fill="${S}"/>
      <circle cx="68" cy="72" r="3" fill="${B}"/>`,
  }),
  s({
    id: 'lemon', name: 'Lemon', tags: ['citrus', 'yellow', 'fresh'],
    ratio: 1.2,
    body: `<ellipse cx="50" cy="52" rx="40" ry="30" fill="${M}" transform="rotate(-12 50 52)"/>
      <path d="M12 44q-8-4-6-10" stroke="#B9862E" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M86 40q10 6 8 14" stroke="#B9862E" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="38" cy="42" rx="10" ry="6" fill="#F0DC9A" opacity=".7" transform="rotate(-12 38 42)"/>`,
  }),
  s({
    id: 'strawberry', name: 'Strawberry', tags: ['fruit', 'berry', 'summer'],
    body: `<path d="M50 90c-18-8-28-24-28-38 0-12 12-20 28-20s28 8 28 20c0 14-10 30-28 38Z" fill="${T}"/>
      <path d="M32 30q8-6 18-4t18 4q-4-12-18-14T32 30Z" fill="${SD}"/>
      <path d="M50 16v12" stroke="${SD}" stroke-width="3.6" stroke-linecap="round"/>
      ${[[40, 48], [58, 46], [50, 60], [36, 64], [64, 62], [50, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#F6E7C6"/>`).join('')}`,
  }),
  s({
    id: 'bread', name: 'Bread', tags: ['bakery', 'loaf', 'toast'],
    ratio: 1.25,
    body: `<path d="M12 56q0-28 38-28t38 28v20q0 8-8 8H20q-8 0-8-8Z" fill="#E0B87C"/>
      <path d="M20 56q0-18 30-18t30 18Z" fill="#EFD3A6"/>
      <path d="M30 40q4 10 2 16M50 34q2 12 0 18M70 40q-4 10-2 16" stroke="#C69553" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  }),
  s({
    id: 'icecream', name: 'Ice cream', tags: ['dessert', 'summer', 'cone'],
    body: `<path d="M34 46h32L54 92q-4 6-8 0Z" fill="#E0B87C"/>
      <path d="M38 52l24 4M36 62l22 4M42 74l14 2" stroke="#C69553" stroke-width="2" opacity=".8"/>
      <circle cx="40" cy="38" r="15" fill="${P}"/><circle cx="60" cy="38" r="15" fill="#CFE0E8"/>
      <circle cx="50" cy="26" r="14" fill="${M}"/>
      <circle cx="50" cy="14" r="4" fill="${T}"/>`,
  }),
]

/* ------------------------------------------------------------------ travel */

const travel: Sticker[] = [
  s({
    id: 'plane', name: 'Plane', tags: ['flight', 'airport', 'trip'],
    body: `<path d="M8 56l84-30-20 38-14 4-6 20-10-18-18-6Z" fill="${B}"/>
      <path d="M92 26 42 70" stroke="${BD}" stroke-width="2.6" opacity=".7"/>`,
  }),
  s({
    id: 'suitcase', name: 'Suitcase', tags: ['luggage', 'packing', 'trip'],
    body: `<path d="M38 28V20c0-4 3-6 7-6h10c4 0 7 2 7 6v8" fill="none" stroke="${KD}" stroke-width="4" stroke-linecap="round"/>
      <rect x="16" y="28" width="68" height="54" rx="7" fill="${K}"/>
      <rect x="16" y="44" width="68" height="9" fill="${KD}" opacity=".55"/>
      <rect x="44" y="28" width="12" height="54" fill="${KD}" opacity=".35"/>
      <rect x="24" y="60" width="16" height="4" rx="2" fill="${C}" opacity=".7"/>`,
  }),
  s({
    id: 'pin', name: 'Map pin', tags: ['location', 'place', 'map'],
    ratio: 0.78, tintable: true,
    body: `<path d="M50 94C32 66 22 52 22 38a28 28 0 0 1 56 0c0 14-10 28-28 56Z" fill="currentColor"/>
      <circle cx="50" cy="37" r="11" fill="${C}"/>`,
  }),
  s({
    id: 'compass', name: 'Compass', tags: ['direction', 'explore', 'north'],
    body: `<circle cx="50" cy="50" r="38" fill="${C}" stroke="${KD}" stroke-width="4"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="${KD}" stroke-width="1.6" opacity=".5"/>
      <path d="M50 22 60 50 50 78 40 50Z" fill="${T}"/>
      <path d="M50 78 40 50h20Z" fill="${C}" stroke="${T}" stroke-width="2"/>
      <circle cx="50" cy="50" r="4" fill="${KD}"/>`,
  }),
  s({
    id: 'ticket', name: 'Ticket', tags: ['stub', 'cinema', 'entry'],
    ratio: 1.7,
    body: `<path d="M6 26h88v14a10 10 0 0 0 0 20v14H6V60a10 10 0 0 0 0-20Z" fill="${M}"/>
      <path d="M54 26v48" stroke="${C}" stroke-width="3" stroke-dasharray="6 5"/>
      <rect x="14" y="40" width="30" height="5" rx="2.5" fill="#8C6414" opacity=".8"/>
      <rect x="14" y="52" width="20" height="5" rx="2.5" fill="#8C6414" opacity=".6"/>`,
  }),
  s({
    id: 'camera', name: 'Camera', tags: ['photo', 'snapshot', 'memory'],
    ratio: 1.2,
    body: `<path d="M34 28h32l6 8h14a6 6 0 0 1 6 6v34a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V42a6 6 0 0 1 6-6h14Z" fill="${I}"/>
      <circle cx="50" cy="58" r="17" fill="${B}"/><circle cx="50" cy="58" r="9" fill="${BD}"/>
      <circle cx="44" cy="52" r="3.4" fill="${C}" opacity=".7"/>
      <rect x="74" y="42" width="10" height="5" rx="2.5" fill="${M}"/>`,
  }),
  s({
    id: 'postcard', name: 'Postcard', tags: ['mail', 'letter', 'send'],
    ratio: 1.45,
    body: `<rect x="6" y="22" width="88" height="56" rx="4" fill="${C}" stroke="${KD}" stroke-width="3"/>
      <path d="M54 30v40" stroke="${KD}" stroke-width="2" opacity=".5"/>
      <rect x="72" y="30" width="16" height="14" rx="2" fill="${T}" opacity=".85"/>
      <path d="M60 54h28M60 62h20" stroke="${KD}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
      <path d="M14 66q10-22 18-8t16-14" stroke="${S}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  }),
  s({
    id: 'globe', name: 'Globe', tags: ['world', 'earth', 'far'],
    body: `<circle cx="50" cy="50" r="38" fill="${B}"/>
      <path d="M50 12v76M12 50h76" stroke="${C}" stroke-width="2.4" opacity=".6"/>
      <ellipse cx="50" cy="50" rx="18" ry="38" fill="none" stroke="${C}" stroke-width="2.4" opacity=".6"/>
      <path d="M24 34q26 10 52 0M24 66q26-10 52 0" stroke="${C}" stroke-width="2.4" fill="none" opacity=".6"/>
      <path d="M32 40q10-8 18 2t16-4" fill="${SD}" opacity=".75"/>`,
  }),
  s({
    id: 'tent', name: 'Tent', tags: ['camp', 'outdoors', 'night'],
    ratio: 1.3,
    body: `<path d="M50 16 92 80H8Z" fill="${S}"/>
      <path d="M50 16 66 80H34Z" fill="${SD}"/>
      <path d="M50 40 60 80H40Z" fill="#F6E7C6"/>
      <path d="M8 80h84" stroke="${KD}" stroke-width="3.4" stroke-linecap="round"/>`,
  }),
  s({
    id: 'train', name: 'Train', tags: ['rail', 'commute', 'journey'],
    ratio: 1.3,
    body: `<rect x="14" y="22" width="72" height="50" rx="10" fill="${T}"/>
      <rect x="22" y="32" width="24" height="18" rx="3" fill="#CFE0E8"/>
      <rect x="54" y="32" width="24" height="18" rx="3" fill="#CFE0E8"/>
      <rect x="14" y="58" width="72" height="6" fill="${TD}"/>
      <circle cx="32" cy="78" r="8" fill="${I}"/><circle cx="68" cy="78" r="8" fill="${I}"/>
      <path d="M10 88h80" stroke="${KD}" stroke-width="3.4" stroke-linecap="round"/>`,
  }),
]

/* ------------------------------------------------------------------- moods */

const moods: Sticker[] = [
  s({
    id: 'bright', name: 'Bright', tags: ['happy', 'good', 'sunny', 'mood'],
    body: `<circle cx="50" cy="50" r="36" fill="${M}"/>
      <path d="M32 42q6-8 12 0M56 42q6-8 12 0" stroke="${I}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M32 60q18 18 36 0" stroke="${I}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="60" r="5" fill="${P}" opacity=".75"/><circle cx="74" cy="60" r="5" fill="${P}" opacity=".75"/>`,
  }),
  s({
    id: 'calm', name: 'Calm', tags: ['quiet', 'steady', 'peaceful', 'mood'],
    body: `<circle cx="50" cy="50" r="36" fill="${S}"/>
      <path d="M30 44q7 6 14 0M56 44q7 6 14 0" stroke="${I}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M38 64q12 8 24 0" stroke="${I}" stroke-width="4.2" fill="none" stroke-linecap="round"/>`,
  }),
  s({
    id: 'meh', name: 'Meh', tags: ['neutral', 'okay', 'flat', 'mood'],
    body: `<circle cx="50" cy="50" r="36" fill="#C4BAA7"/>
      <circle cx="37" cy="44" r="4.4" fill="${I}"/><circle cx="63" cy="44" r="4.4" fill="${I}"/>
      <path d="M36 66h28" stroke="${I}" stroke-width="4.2" stroke-linecap="round"/>`,
  }),
  s({
    id: 'heavy', name: 'Heavy', tags: ['sad', 'tired', 'low', 'mood'],
    body: `<circle cx="50" cy="50" r="36" fill="${B}"/>
      <path d="M30 40q7 6 14 0M56 40q7 6 14 0" stroke="${I}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M36 70q14-12 28 0" stroke="${I}" stroke-width="4.2" fill="none" stroke-linecap="round"/>
      <path d="M74 54q4 8 0 11t-4-11q2-4 2-4Z" fill="${BD}"/>`,
  }),
  s({
    id: 'stormy', name: 'Stormy', tags: ['angry', 'overwhelmed', 'a lot', 'mood'],
    body: `<circle cx="50" cy="50" r="36" fill="${T}"/>
      <path d="M28 38l16 8M72 38l-16 8" stroke="${I}" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M36 72q14-10 28 0" stroke="${I}" stroke-width="4.2" fill="none" stroke-linecap="round"/>
      <path d="M44 54h12l-8 12h10" stroke="${M}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  }),
  s({
    id: 'heart', name: 'Heart', tags: ['love', 'like', 'favourite'],
    tintable: true,
    body: `<path d="M50 86C22 66 12 52 12 38a20 20 0 0 1 38-9 20 20 0 0 1 38 9c0 14-10 28-38 48Z" fill="currentColor"/>`,
  }),
  s({
    id: 'sparkle', name: 'Sparkle', tags: ['shine', 'magic', 'nice'],
    tintable: true,
    body: `<path d="M50 6c4 26 14 36 40 40-26 4-36 14-40 44-4-30-14-40-40-44 26-4 36-14 40-40Z" fill="currentColor"/>
      <path d="M84 12c2 9 5 12 13 14-8 2-11 5-13 14-2-9-5-12-13-14 8-2 11-5 13-14Z" fill="currentColor" opacity=".7"/>`,
  }),
  s({
    id: 'exclaim', name: 'Oh!', tags: ['note', 'important', 'wow'],
    ratio: 0.5, tintable: true,
    body: `<rect x="38" y="10" width="24" height="52" rx="12" fill="currentColor"/>
      <circle cx="50" cy="80" r="13" fill="currentColor"/>`,
  }),
]

/* ----------------------------------------------------------------- doodles */

const doodles: Sticker[] = [
  s({
    id: 'arrow-curve', name: 'Curved arrow', tags: ['point', 'direction'],
    ratio: 1.4, tintable: true,
    body: `<path d="M8 72q26-46 74-40" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M66 20l18 12-20 12" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  }),
  s({
    id: 'swirl', name: 'Swirl', tags: ['flourish', 'spiral'],
    tintable: true,
    body: `<path d="M50 88c26 0 38-18 38-34S74 22 58 24 38 42 46 52s26 4 22-10-24-14-30 0" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  }),
  s({
    id: 'squiggle', name: 'Squiggle', tags: ['line', 'wave', 'divider'],
    ratio: 2.6, tintable: true,
    body: `<path d="M4 50q10-22 20 0t20 0 20 0 20 0 12-10" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`,
  }),
  s({
    id: 'starburst', name: 'Starburst', tags: ['pop', 'attention'],
    tintable: true,
    body: `${Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45 * Math.PI) / 180
      return `<line x1="${(50 + Math.cos(a) * 16).toFixed(1)}" y1="${(50 + Math.sin(a) * 16).toFixed(1)}"
        x2="${(50 + Math.cos(a) * (38 + (i % 2) * 6)).toFixed(1)}" y2="${(50 + Math.sin(a) * (38 + (i % 2) * 6)).toFixed(1)}"
        stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`
    }).join('')}`,
  }),
  s({
    id: 'heart-outline', name: 'Drawn heart', tags: ['love', 'outline'],
    tintable: true,
    body: `<path d="M50 84C24 64 14 52 16 38c2-12 18-16 26-6 2 2 4 6 8 6s6-4 8-6c8-10 24-6 26 6 2 14-8 26-34 46Z"
      stroke="currentColor" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`,
  }),
  s({
    id: 'spiral', name: 'Spiral', tags: ['loop', 'doodle'],
    tintable: true,
    body: `<path d="M50 50c0-6 8-6 8 2s-10 12-18 6-8-22 4-28 30-2 36 14 0 34-16 42-38 6-48-8"
      stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  }),
  s({
    id: 'check', name: 'Check', tags: ['done', 'tick', 'yes'],
    tintable: true,
    body: `<path d="M16 54 40 76 86 20" stroke="currentColor" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  }),
  s({
    id: 'bracket', name: 'Bracket', tags: ['group', 'aside'],
    ratio: 0.42, tintable: true,
    body: `<path d="M74 6q-30 0-30 20v14q0 10-24 10 24 0 24 10v14q0 20 30 20"
      stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"
      transform="scale(0.5 1) translate(50 0)"/>`,
  }),
  s({
    id: 'underline', name: 'Underline', tags: ['emphasis', 'line'],
    ratio: 3.2, tintable: true,
    body: `<path d="M4 46q24-8 46-6t46 8" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M10 60q22-6 42-4t38 6" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`,
  }),
  s({
    id: 'cross-hatch', name: 'Scribble', tags: ['fill', 'texture'],
    ratio: 1.4, tintable: true,
    body: `${Array.from({ length: 7 }, (_, i) =>
      `<path d="M${10 + i * 12} 82 ${34 + i * 12} 18" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" opacity=".75"/>`
    ).join('')}`,
  }),
]

/* ------------------------------------------------------------------ labels */

const labels: Sticker[] = [
  s({
    id: 'banner', name: 'Banner', tags: ['title', 'ribbon', 'header'],
    ratio: 2.4, tintable: true,
    body: `<path d="M4 18h92l-16 32 16 32H4l16-32Z" fill="currentColor"/>
      <path d="M22 26h56M22 74h56" stroke="#FBF7EF" stroke-width="2" opacity=".35"/>`,
  }),
  s({
    id: 'ribbon', name: 'Ribbon', tags: ['award', 'tag'],
    ratio: 2.1, tintable: true,
    body: `<path d="M2 22h96v56H2l14-28Z" fill="currentColor"/>
      <path d="M84 22 98 50 84 78" fill="none" stroke="${C}" stroke-width="3" opacity=".5"/>
      <path d="M2 22 16 50 2 78" fill="none" stroke="${C}" stroke-width="3" opacity=".28"/>`,
  }),
  s({
    id: 'speech', name: 'Speech bubble', tags: ['quote', 'said', 'note'],
    ratio: 1.25,
    body: `<path d="M12 20h76a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H44L24 86l3-18h-15a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6Z"
        fill="${C}" stroke="${I}" stroke-width="3.6" stroke-linejoin="round"/>`,
  }),
  s({
    id: 'pricetag', name: 'Tag', tags: ['label', 'name'],
    ratio: 1.6, tintable: true,
    body: `<path d="M30 20h56a6 6 0 0 1 6 6v48a6 6 0 0 1-6 6H30L4 50Z" fill="currentColor"/>
      <circle cx="26" cy="50" r="6" fill="${C}"/>`,
  }),
  s({
    id: 'badge', name: 'Name badge', tags: ['hello', 'label'],
    ratio: 1.45,
    body: `<rect x="6" y="18" width="88" height="64" rx="6" fill="${C}" stroke="${T}" stroke-width="3.4"/>
      <rect x="6" y="18" width="88" height="20" rx="6" fill="${T}"/>
      <path d="M6 38h88" stroke="${T}" stroke-width="3"/>
      <path d="M22 58h56M22 70h38" stroke="${I}" stroke-width="3" stroke-linecap="round" opacity=".35"/>`,
  }),
  s({
    id: 'flag', name: 'Sticky flag', tags: ['bookmark', 'mark'],
    ratio: 0.55, tintable: true,
    body: `<path d="M26 8h48v84L50 74 26 92Z" fill="currentColor"/>`,
  }),
  s({
    id: 'quote', name: 'Quote marks', tags: ['said', 'excerpt'],
    ratio: 1.5, tintable: true,
    body: `<path d="M10 66q0-30 24-38l4 10q-14 6-14 18h12v22H10Zm50 0q0-30 24-38l4 10q-14 6-14 18h12v22H60Z" fill="currentColor"/>`,
  }),
  s({
    id: 'corner', name: 'Photo corner', tags: ['frame', 'album', 'mount'],
    body: `<path d="M4 4h60L4 64Z" fill="${I}" opacity=".78"/>`,
  }),
  s({
    id: 'stamp', name: 'Postage stamp', tags: ['mail', 'post', 'frame'],
    ratio: 0.85,
    // Perforations are punched notches around a solid edge. A dashed stroke
    // reads as a broken-image placeholder once it gets below ~60px.
    body: `<rect x="6" y="8" width="88" height="84" fill="${C}"/>
      ${Array.from({ length: 10 }, (_, i) => `<circle cx="${10 + i * 9}" cy="8" r="3.1" fill="#FAF6EE"/><circle cx="${10 + i * 9}" cy="92" r="3.1" fill="#FAF6EE"/>`).join('')}
      ${Array.from({ length: 9 }, (_, i) => `<circle cx="6" cy="${13 + i * 9}" r="3.1" fill="#FAF6EE"/><circle cx="94" cy="${13 + i * 9}" r="3.1" fill="#FAF6EE"/>`).join('')}
      <rect x="15" y="17" width="70" height="52" fill="${S}"/>
      <path d="M15 61l17-17 13 13 15-19 25 25v6H15Z" fill="${SD}"/>
      <circle cx="34" cy="30" r="5.5" fill="${M}"/>
      <path d="M20 79h56" stroke="${KD}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`,
  }),
  s({
    id: 'paperclip', name: 'Paper clip', tags: ['attach', 'clip'],
    ratio: 0.5,
    body: `<path d="M64 26v44a20 20 0 0 1-40 0V22a13 13 0 0 1 26 0v44a7 7 0 0 1-14 0V30"
      stroke="#9AA0A6" stroke-width="7" fill="none" stroke-linecap="round" transform="scale(0.55 1) translate(38 0)"/>`,
  }),
]

/* --------------------------------------------------------------- registry */

const BUILT_IN: StickerPack[] = [
  { id: 'nature', name: 'Nature',  blurb: 'Leaves, weather and quiet outdoors', stickers: nature },
  { id: 'food',   name: 'Food',    blurb: 'Coffee, snacks and good dinners',    stickers: food },
  { id: 'travel', name: 'Travel',  blurb: 'Tickets, maps and getting there',    stickers: travel },
  { id: 'moods',  name: 'Moods',   blurb: 'Five faces, plus a few reactions',   stickers: moods },
  { id: 'doodles',name: 'Doodles', blurb: 'Arrows, squiggles and marks',        stickers: doodles },
  { id: 'labels', name: 'Labels',  blurb: 'Banners, tags and photo corners',    stickers: labels },
]

const packs: StickerPack[] = [...BUILT_IN]

/**
 * Add a pack at runtime. Call this before the editor mounts (e.g. from
 * `main.tsx`); see the README for the full recipe.
 */
export function registerStickerPack(pack: StickerPack): void {
  const existing = packs.findIndex((p) => p.id === pack.id)
  if (existing >= 0) packs[existing] = pack
  else packs.push(pack)
}

export function stickerPacks(): StickerPack[] {
  return packs
}

export function findSticker(packId: string, stickerId: string): Sticker | null {
  const pack = packs.find((p) => p.id === packId)
  return pack?.stickers.find((st) => st.id === stickerId) ?? null
}

/** Wraps a sticker's body in a complete SVG document, applying any tint. */
export function stickerSvg(sticker: Sticker, tint?: string): string {
  const body = sticker.tintable && tint
    ? sticker.body.replaceAll('currentColor', tint)
    : sticker.body.replaceAll('currentColor', tint ?? I)
  const w = Math.round(100 * sticker.ratio)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="100" viewBox="${
    ((100 - w) / 2).toFixed(1)} 0 ${w} 100">${body}</svg>`
}

export function stickerCacheKey(packId: string, stickerId: string, tint?: string): string {
  return `st:${packId}:${stickerId}:${tint ?? ''}`
}

/** Fuzzy search across every registered pack. */
export function searchStickers(query: string): { pack: StickerPack; sticker: Sticker }[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: { pack: StickerPack; sticker: Sticker }[] = []
  for (const pack of packs) {
    for (const sticker of pack.stickers) {
      const haystack = `${sticker.name} ${sticker.tags.join(' ')} ${pack.name}`.toLowerCase()
      if (haystack.includes(q)) out.push({ pack, sticker })
    }
  }
  return out
}
