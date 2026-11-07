// The gate: decides which screen to show. Not set up → a short note.
// Checking the saved session → "Loading". Signed out → the sign-in screen.
// Signed in → your tracker.

import { SignIn } from './components/SignIn.tsx'
import { useSession } from './hooks/useSession.ts'
import { isSupabaseConfigured } from './lib/supabase.ts'
import { Tracker } from './Tracker.tsx'

export default function App() {
  const session = useSession()

  if (!isSupabaseConfigured) {
    return (
      <div className="app signin">
        <h1 className="title">Deadlines</h1>
        <p className="alert" role="alert">
          This copy of the app isn’t connected to its database yet. Fill in .env.local (see .env.example), then
          restart the app.
        </p>
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
