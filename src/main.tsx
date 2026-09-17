import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import { ensureFontsReady } from './content/fonts'

/**
 * Canvas text doesn't participate in CSS font loading — if Konva draws before
 * the handwriting faces arrive, it silently falls back to a system serif and
 * never repaints. Kicking the load off here means it's almost always resolved
 * by the time an editor opens; `EditorCanvas` also awaits it defensively.
 */
void ensureFontsReady()

/**
 * Hosted previews are served from an arbitrary path with no rewrite of unknown
 * URLs to index.html, so a path-based route would 404 on reload. The hash
 * router sidesteps that entirely. Real deployments keep clean URLs.
 */
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
