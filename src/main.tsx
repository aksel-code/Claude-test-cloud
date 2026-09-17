import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
