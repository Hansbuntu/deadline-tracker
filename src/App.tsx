// The gate: decides which screen to show. Not set up → a short note.
// Checking the saved session → "Loading". Signed out → the sign-in screen.
// Signed in → your tracker. The update notice can appear above any of them.

import type { ReactNode } from 'react'
import { SignIn } from './components/SignIn.tsx'
import { UpdateNotice } from './components/UpdateNotice.tsx'
import { useSession } from './hooks/useSession.ts'
import { isSupabaseConfigured, missingSettings } from './lib/supabase.ts'
import { Tracker } from './Tracker.tsx'

export default function App() {
  return (
    <>
      <UpdateNotice />
      <Screen />
    </>
  )
}

function Screen(): ReactNode {
  const session = useSession()

  if (!isSupabaseConfigured) {
    // Settings are built into the site when it's built, so adding them later
    // only takes effect after a rebuild (a restart locally, a redeploy on Vercel).
    return (
      <div className="app signin">
        <h1 className="title">Deadlines</h1>
        <div className="alert setup-alert" role="alert">
          <p>This copy of the app isn’t connected to its database yet. Missing:</p>
          <ul>
            {missingSettings.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
          <p>
            <strong>On Vercel:</strong> add them in Project Settings → Environment Variables (for Production), then
            redeploy.
            <br />
            <strong>On your laptop:</strong> put them in .env.local (see .env.example), then restart npm run dev.
          </p>
        </div>
      </div>
    )
  }

  if (session.status === 'loading') {
    return (
      <div className="app">
        <p className="empty">Loading…</p>
      </div>
    )
  }

  if (session.status === 'signed-out') return <SignIn />

  return <Tracker accountEmail={session.session.user.email ?? 'your account'} />
}
