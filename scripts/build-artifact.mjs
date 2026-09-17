/**
 * Assembles `dist-artifact/` into one self-contained HTML page for hosted
 * previews (Claude Artifacts and anywhere else that serves a single file).
 *
 * Why single-file: the host serves the page from a path we don't control and
 * may not resolve sibling assets the way a static server would, so every
 * stylesheet, script and font is inlined. Nothing is fetched at runtime.
 *
 * The output deliberately omits <!doctype>, <html>, <head> and <body>: the
 * Artifact publisher supplies that skeleton (with charset and a
 * viewport-fit=cover viewport meta) and wraps whatever we hand it.
 *
 * Usage:
 *   VITE_HASH_ROUTER=1 npx vite build --mode artifact
 *   node scripts/build-artifact.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist-artifact')
const OUT = path.join(DIST, 'pagebound-preview.html')

const read = (p) => fs.readFileSync(p, 'utf8')

/* ----------------------------------------------------------------- page */

const html = read(path.join(DIST, 'index.html'))

// index.html carries two stylesheet links: the font faces (handled by
// inlineFonts, whose urls are still /fonts/... and would 404 here) and Vite's
// emitted bundle. Match on the bundle specifically — taking "the first
// stylesheet" silently inlines the font CSS as the app CSS and ships a page
// with no layout at all.
const cssHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((href) => /assets\//.test(href))

const jsSrc = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1]

if (cssHrefs.length === 0) {
  throw new Error(
    `No built stylesheet found in index.html. Saw: ${
      [...html.matchAll(/href="([^"]+\.css)"/g)].map((m) => m[1]).join(', ') || 'none'}`,
  )
}
if (!jsSrc) throw new Error('No module script found in index.html')

const appCss = cssHrefs
  .map((href) => read(path.join(DIST, href.replace(/^\.?\//, ''))))
  .join('\n')
const appJs = read(path.join(DIST, jsSrc.replace(/^\.?\//, '')))

console.log(`  app css: ${cssHrefs.join(', ')} (${(appCss.length / 1024).toFixed(0)} KB)`)
console.log(`  app js : ${jsSrc} (${(appJs.length / 1024).toFixed(0)} KB)`)

// Belt and braces: nothing in the finished page may point at /fonts/.
const guard = (page) => {
  const leaks = [...page.matchAll(/(?:src|href)="(\/fonts\/[^"]*)"/g)].map((m) => m[1])
  if (leaks.length) throw new Error(`Page still references: ${leaks.join(', ')}`)
}

const PUBLISH = path.join(DIST, 'publish')
fs.rmSync(PUBLISH, { recursive: true, force: true })
fs.mkdirSync(path.join(PUBLISH, 'fonts'), { recursive: true })

/* ---------------------------------------------------------------- fonts */

/**
 * Copies the woff2 files and rewrites the stylesheet to reference them
 * relatively. The page, the stylesheet and the fonts directory all sit at the
 * same level, so `fonts/x.woff2` resolves from the stylesheet's own location
 * regardless of the path the host serves the artifact from.
 *
 * The @font-face blocks are still collapsed per file (see above): several
 * blocks share one variable-font file, and one block with a weight range lets
 * the browser interpolate rather than snapping to fixed instances.
 */
function emitFonts() {
  const css = read(path.join(ROOT, 'public/fonts/fonts.css'))
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? []
  if (blocks.length === 0) throw new Error('No @font-face blocks found in fonts.css')

  const groups = new Map()
  for (const block of blocks) {
    const href = block.match(/url\((\/fonts\/[^)]+\.woff2)\)/)?.[1]
    if (!href) continue
    const weight = block.match(/font-weight:\s*([^;]+);/)?.[1].trim() ?? '400'
    const entry = groups.get(href) ?? { weights: [], block }
    for (const part of weight.split(/\s+/)) {
      const n = Number(part)
      if (Number.isFinite(n)) entry.weights.push(n)
    }
    groups.set(href, entry)
  }

  const out = []
  for (const [href, { weights, block }] of groups) {
    const name = path.basename(href)
    const src = path.join(ROOT, 'public', href.replace(/^\//, ''))
    if (!fs.existsSync(src)) throw new Error(`Missing font file: ${href}`)
    fs.copyFileSync(src, path.join(PUBLISH, 'fonts', name))

    const min = Math.min(...weights)
    const max = Math.max(...weights)
    out.push(
      block
        .replace(/url\(\/fonts\/[^)]+\.woff2\)/, `url(fonts/${name})`)
        .replace(/font-weight:\s*[^;]+;/, `font-weight: ${min === max ? min : `${min} ${max}`};`),
    )
  }

  console.log(`  fonts: ${groups.size} files from ${blocks.length} @font-face blocks`)
  return out.join('\n')
}

/* ----------------------------------------------------------- emit files */

fs.writeFileSync(path.join(PUBLISH, 'app.css'), `${emitFonts()}\n${appCss}`)
fs.writeFileSync(path.join(PUBLISH, 'app.js'), appJs)

const page = `<title>Pagebound</title>

<link rel="stylesheet" href="app.css">

<style>
  /*
   * Host overrides.
   *
   * The publish skeleton pads :root by the phone's safe-area insets, which is
   * right for a document and wrong for a full-screen app: Pagebound sizes its
   * own shell and already applies those insets itself, via .safe-t / .safe-b on
   * the nav bars and the editor header. Left in place the padding is counted
   * twice and pushes the canvas out of view.
   */
  :root { padding: 0 !important; }
  html, body { height: 100%; margin: 0; }
  #root { min-height: 100%; }
</style>

<script>
  // Apply the stored theme before first paint, so there is no flash of the
  // wrong one. Mirrors resolveTheme() in src/store/settings.ts; wrapped because
  // a private window can throw on localStorage access.
  (function () {
    try {
      var raw = localStorage.getItem('pagebound.theme') || 'system';
      var dark = raw === 'dark' || (raw === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    } catch (e) { document.documentElement.dataset.theme = 'light'; }
  })();
</script>

<div id="root"></div>

<script type="module" src="app.js"></script>
`

guard(page)
fs.writeFileSync(path.join(PUBLISH, 'index.html'), page)

const total = fs.readdirSync(PUBLISH, { recursive: true })
  .map((f) => path.join(PUBLISH, String(f)))
  .filter((f) => fs.statSync(f).isFile())
  .reduce((sum, f) => sum + fs.statSync(f).size, 0)

console.log(`  page   : ${(Buffer.byteLength(page) / 1024).toFixed(1)} KB`)
console.log(`  bundle : ${(total / 1024 / 1024).toFixed(2)} MB across ${
  fs.readdirSync(PUBLISH, { recursive: true }).length} entries`)
console.log(`  wrote  : ${path.relative(ROOT, PUBLISH)}/`)
