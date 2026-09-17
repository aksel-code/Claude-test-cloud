import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

/**
 * `--mode artifact` builds a single self-contained page for hosted previews
 * (e.g. a Claude Artifact), where the app is served from an unknown path with
 * no SPA rewrite and no control over the document head:
 *
 *  - relative asset base, and dynamic imports inlined, so nothing depends on
 *    the page's URL resolving a particular way
 *  - no service worker: its precache manifest is path-absolute
 *  - hash routing, because deep links can't be rewritten to index.html
 *
 * The normal build is untouched.
 */
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact'

  return {
  base: artifact ? './' : '/',
  plugins: [
    react(),
    ...(artifact ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'fonts/*.woff2', 'fonts/fonts.css'],
      manifest: {
        name: 'Pagebound',
        short_name: 'Pagebound',
        description: 'A private, tactile journaling scrapbook.',
        theme_color: '#FAF6EE',
        background_color: '#FAF6EE',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Pages/photos live in IndexedDB; the shell is all we need cached.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    })]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // See src/stubs/empty.ts — jsPDF's unused optional deps.
      html2canvas: path.resolve(__dirname, './src/stubs/empty.ts'),
      dompurify: path.resolve(__dirname, './src/stubs/empty.ts'),
      canvg: path.resolve(__dirname, './src/stubs/empty.ts'),
    },
  },
  build: {
    target: 'es2022',
    outDir: artifact ? 'dist-artifact' : 'dist',
    // One CSS file and one JS file: the assembler inlines both, and a
    // code-split chunk can't be inlined into a single document.
    cssCodeSplit: !artifact,
    assetsInlineLimit: artifact ? 0 : 4096,
    rollupOptions: {
      output: artifact
        ? { inlineDynamicImports: true }
        : {
            manualChunks: {
              konva: ['konva', 'react-konva'],
              pdf: ['jspdf'],
            },
          },
    },
  },
  }
})
