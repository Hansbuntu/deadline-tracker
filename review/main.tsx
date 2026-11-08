// Review copy entry point: the real screens and styles, with fake data and
// fake sign-in (see vite.review.config.ts). Pick a screen with the address:
//   /                  the tracker, full of sample data
//   /?data=empty       the tracker with nothing in it yet
//   /?screen=signin    the sign-in screen
import '@fontsource/newsreader/600.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SignIn } from '../src/components/SignIn.tsx'
import '../src/styles/global.css'
import { Tracker } from '../src/Tracker.tsx'

const screen = new URLSearchParams(window.location.search).get('screen')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{screen === 'signin' ? <SignIn /> : <Tracker accountEmail="artist@example.com" />}</StrictMode>,
)
