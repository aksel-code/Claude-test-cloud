# Pagebound

A private, tactile journaling scrapbook. Write, photograph, tape things down.
Everything stays on your device.

*Pagebound is a placeholder name.*

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve dist/ locally
npm run lint
npm run typecheck
```

Node 20.19+ or 22.12+. No API keys, no backend, no environment variables.

### Checking it on a phone

Pagebound is a PWA, so it's worth looking at on a real device. Three routes,
in increasing order of fidelity:

**1. Same Wi-Fi, over HTTP** — quickest, but degraded:

```bash
npm run dev:host          # binds 0.0.0.0 and prints a Network: URL
```

Open the printed `http://192.168.x.x:5173` on the phone.

> **What won't work this way.** `http://<LAN-IP>` is not a *secure context*, so
> the browser withholds `crypto.subtle`, service workers and WebAuthn. That
> means **no app lock, no biometrics, no install prompt and no offline mode**.
> Everything else — the editor, photos, export, reading mode — works normally,
> and Settings tells you why the lock is unavailable rather than failing at you.

**2. A tunnel** — full fidelity, one command, no deploy:

```bash
npm run build && npm run preview     # in one terminal
npx cloudflared tunnel --url http://localhost:4173   # in another
```

You get an `https://…trycloudflare.com` URL. Secure context, so the lock,
install prompt and offline mode all behave exactly as they will in production.
Note this publishes your dev server to the public internet for the life of the
command.

**3. Deploy the static build** — best for repeat testing. `dist/` is a plain
static SPA with no backend, so any static host works. Configure the host to
rewrite unknown paths to `index.html` (the app uses `BrowserRouter`).

Whichever route you take, remember the data is per-origin: pages written at
`localhost` are not the same database as pages written at a tunnel URL.


On first launch the app seeds a sample journal with three pages so the editor
has something to show. It only ever seeds an empty database.

---

## Information architecture

```
Lock screen (only when a passcode is set)
└── App shell
    ├── /                   Library ....... journal shelf, recent pages, streak
    ├── /journal/:id        Journal ....... page grid, cover editing, export
    ├── /page/:id           Editor ........ the freeform canvas
    ├── /read/:journalId    Reader ........ full-screen page turning
    ├── /calendar           Calendar ...... month grid + "on this day"
    ├── /moods              Moods ......... mood over time
    ├── /search             Search ........ text, captions, alt text, tags
    └── /settings           Settings ...... theme, motion, lock, data & privacy
```

Overlays: New Journal, Today, Quick Capture, Page Details, Export, the five
element pickers, and the long-press layer menu.

---

## Architecture

```
src/
  lib/            no React — the model, storage and pure helpers
    types.ts        persisted schema (treat changes as migrations)
    db.ts           IndexedDB: journals, pages, assets, thumbs, meta
    image.ts        photo compression + the decoded-image pools
    elements.ts     element factories, bounds, deterministic tilt
    export.tsx      offscreen page renderer → PNG / PDF
    lock.ts         passcode (PBKDF2) + WebAuthn
    seed.ts         the sample journal
    date.ts / id.ts / svg.ts / motion.ts / weather.ts
  content/        the app's "materials" — all generated, no binary assets
    stickers.ts     66 stickers in 6 packs
    tapes.ts        washi patterns with seeded torn edges
    papers.ts       page backgrounds
    notes.ts        sticky / ticket / receipt / index card silhouettes
    covers.ts       journal cover materials
    fonts.ts        the type ramp, self-hosted
    moods.ts / prompts.ts
  store/          Zustand
    editor.ts       elements, selection, undo/redo, autosave
    library.ts      journals, recents, search
    settings.ts     theme, motion, snap, streak
  components/
    editor/         canvas, nodes, toolbar, inspector, pickers, overlays
    library/ browse/ read/ lock/ daily/ export/ ui/
```

### Coordinate model

A page is a fixed **1080 × 1440** space. Every element position, size and
stroke width is stored in those units, and the Konva stage is scaled to fit
whatever room it has. A page composed on a phone opens byte-identical on a
desktop, and export is just the same scene at a higher pixel ratio.

Elements are positioned by their **centre**, with `offsetX/offsetY` at half
their size, so rotation pivots about the middle without re-deriving an offset
on every transform.

### The editor canvas

Three Konva layers, and the split matters:

| Layer | Contents | Why separate |
|---|---|---|
| paper | one background image | almost never changes; skipped on element redraws |
| elements | everything the user placed | the busy one |
| overlay | transform handles, snap guides, live stroke | hidden wholesale when capturing a thumbnail or export |

Text is edited in a real positioned `<textarea>` rather than on the canvas.
Canvas text editing means reimplementing the caret, selection, IME composition,
autocorrect and every platform's text shortcuts — badly.

### Undo/redo

`store/editor.ts` keeps 60 document snapshots. Element objects are treated as
immutable, so snapshots share element references — a 60-deep history of a
50-element page costs a few hundred pointers, not 60 deep clones. Drags and
resizes snapshot once per gesture (`beginGesture`/`endGesture`), and derived
geometry like auto-grown text height uses `updateQuiet`, which never lands in
the undo stack.

### Storage

IndexedDB via `idb`, five stores:

| Store | Holds |
|---|---|
| `journals` | journal records |
| `pages` | page documents (indexed by journal, date, updatedAt) |
| `assets` | photo Blobs + a thumbnail, kept out of page records |
| `thumbs` | rendered page previews |
| `meta` | settings, lock config, seed version |

Photos are decoded, downscaled to 2000px, re-encoded (WebP where supported,
else JPEG) and thumbnailed *before* they are ever written. Page thumbnails are
written by autosave; anything without one renders itself on first view and
stores the result, through a queue so a grid of twenty doesn't lock the main
thread.

### Performance

- Elements are one Konva `Group` with a single hit rectangle; children don't listen.
- `perfectDrawEnabled={false}` everywhere (no overlapping translucent strokes to protect).
- Decoded images are pooled and the pools are synchronously peekable, so a
  re-mount paints on the first frame instead of flashing empty.
- Drawn strokes drop points closer than ~2.5 page units.
- Thumbnails lazy-load behind an `IntersectionObserver`.
- Konva and jsPDF are separate chunks; the library route loads neither.

---

## Adding a sticker pack

Stickers are inline SVG on a 100 × 100 canvas — no binary assets, crisp at any
zoom, a few hundred bytes each.

**1. Write the pack.** Each sticker's `body` is the inner markup only:

```ts
// src/content/packs/seasons.ts
import type { StickerPack } from '@/content/stickers'

export const seasons: StickerPack = {
  id: 'seasons',
  name: 'Seasons',
  blurb: 'Weather and the turning year',
  stickers: [
    {
      id: 'snowflake',
      name: 'Snowflake',
      tags: ['winter', 'cold', 'snow'],
      ratio: 1,          // width / height
      tintable: true,    // `currentColor` in the body becomes user-selectable
      body: `<path d="M50 6v88M12 28l76 44M88 28 12 72"
               stroke="currentColor" stroke-width="6" stroke-linecap="round"/>`,
    },
  ],
}
```

**2. Register it before the editor mounts** — `src/main.tsx` is the right place:

```ts
import { registerStickerPack } from '@/content/stickers'
import { seasons } from '@/content/packs/seasons'

registerStickerPack(seasons)
```

That's it. The pack appears in the picker, joins sticker search, and existing
pages keep working. Registering an `id` that already exists replaces that pack.

**House rules**

- Draw on `0 0 100 100`. `ratio` stretches the viewBox horizontally.
- Use `currentColor` **only** if you set `tintable: true`, and only for shapes
  meant to be recoloured. Anything else should use literal hex.
- Keep it flat, slightly irregular, and in the warm palette — perfectly
  symmetrical shapes read as clip-art next to handwriting.
- Never reuse an `id` inside a pack; pages reference stickers by
  `packId` + `stickerId`, and a page pointing at a sticker that no longer
  exists renders a dashed placeholder rather than breaking.
- SVG `id`s inside generated documents must be namespaced (see `lib/svg.ts`).
  Two inline SVGs that both define `id="p"` will silently both resolve to the
  first one.

Tape patterns (`content/tapes.ts`), note papers (`content/notes.ts`) and page
backgrounds (`content/papers.ts`) extend the same way — add an entry to the
exported array.

---

## Design notes

**Palette.** Cream `#FAF6EE`, ink `#2B2A28`, terracotta `#C8674A`, sage
`#8FA58A`, dusty blue `#7D98B3`, mustard `#D9A441`.

These are a *content* palette — they colour stickers, tape, covers and page
furniture. They are too light for small UI text on cream (terracotta lands at
3.5:1), so interactive surfaces that carry white text use `-deep` variants
picked to clear 4.5:1, and body text uses ink / ink-soft (15.4:1 and 7.2:1).
All tokens live on `:root` in `styles/index.css` and are redefined for dark
mode, which is a warm charcoal "night desk", never pure black.

**Mood chart.** The same muted palette fails as a five-way categorical
encoding — validated against the cream surface, *calm* and *meh* sit about 5–7
ΔE apart, which is hard to separate even with full colour vision. Rather than
loudening the product for one chart, the mood view gives each mood its own
permanently-labelled row: position carries identity, colour only reinforces it,
and there's a table view. See `moodChartColor` in `content/moods.ts`.

**Handmade imperfection.** New elements land with a small rotation (±3°, ±14°
for tape). The angle, the tear along a piece of tape, and the wobble on a torn
photo edge are all derived from the element's own id via `seededRandom`, so a
page looks identical every time it renders instead of twitching on each mount.

**Micro-interactions.** Stickers pop in on a back-ease curve; tape peels down
along its length; saving presses an ink stamp. All of it checks
`prefers-reduced-motion` — including inside Konva, which doesn't see CSS.

---

## Accessibility

- **Contrast.** All UI text clears WCAG AA; body ink is AAA. Focus rings are a
  single high-contrast style applied globally.
- **Touch targets.** Everything interactive clears 44 × 44, including colour
  swatches (which look smaller but carry an invisible expanded hit area).
- **Keyboard, in the editor.** `Tab` cycles elements top-down, arrows nudge
  (`Shift` coarse, `Alt` rotates), `Enter` edits text, `Delete` removes,
  `[` / `]` change layer order, `Cmd/Ctrl+D` duplicates, `Cmd/Ctrl+Z` and
  `Shift+Z` undo and redo, `Escape` deselects.
- **The canvas is not a black box.** Page contents are also exposed as a real
  focusable list of layers, so a screen-reader user can select an element and
  then use every keyboard control above.
- **Alt text** is a first-class field on every photo, surfaced in the Inspector.
- **Reduced motion** follows the OS and can be forced on in Settings.
- **The mood chart** has direct labels on every row, a table view, and a
  screen-reader summary.

---

## Privacy

Everything — pages, photos, settings — lives in this browser's IndexedDB on
this device. No account, no server, no sync, no analytics.

The **only** network request the app ever makes is the optional weather stamp
(Open-Meteo, no API key), which is off by default and needs geolocation. It
sends a latitude/longitude rounded to two decimal places and nothing else.

**The app lock is a lock on the screen, not encryption.** The passcode is
stored as a PBKDF2-SHA256 hash and gates the UI; pages and photos are stored
unencrypted, so anyone with access to the device and browser profile can read
them with developer tools regardless. Encrypting at rest is a real feature but
it changes the recovery story completely — forget the passcode, lose the
journal — so it isn't something to imply falsely. Settings says this in plain
language before you turn the lock on.

Because there is no copy anywhere else, clearing site data deletes the journals
permanently. Export what you'd be sad to lose.

---

## Known limitations

- **No sync or backup.** Single device, by design. PDF/PNG export is the escape hatch.
- **No encryption at rest**, as above.
- **Multi-select** isn't implemented; elements are manipulated one at a time.
- **Photo cropping** isn't implemented — frames and a warmth wash only.
- **The sample photos are generated**, not photographs. Shipping stock imagery
  would mean licensing questions and a megabyte of assets.
- **Haptics are Android-only** in practice; iOS Safari has never shipped the
  Vibration API.
- **The lock, install prompt and offline mode need a secure context** (https or
  localhost). Over a plain-HTTP LAN address the browser withholds the APIs they
  depend on; the app detects this and says so instead of breaking.
- **Biometric unlock** proves "whoever holds this device can satisfy its
  authenticator", not an identity — there's no server to verify against. That's
  the right amount of assurance for a local screen lock, and no more.

---

## Credits

Fonts are self-hosted subsets of Fraunces, Inter, Caveat, Patrick Hand,
Homemade Apple, Kalam and Gloria Hallelujah, all under the SIL Open Font
License 1.1. Regenerate them with `python3 scripts/fetch-fonts.py`.

All sticker, tape, paper and cover artwork is generated by this codebase.
