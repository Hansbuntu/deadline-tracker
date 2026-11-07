// The starting point. React takes over the empty <div id="root"> in index.html
// and draws the App component inside it.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Newsreader, the serif for titles. Bundled with the app (no Google request),
// and the browser only downloads the alphabets a page actually uses.
import '@fontsource/newsreader/600.css'
import App from './App.tsx'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  // StrictMode adds extra checks while developing (it does nothing in the live site).
  <StrictMode>
    <App />
  </StrictMode>,
)
