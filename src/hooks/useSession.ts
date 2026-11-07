import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.ts'

export type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; session: Session }

/**
 * Who is signed in, kept up to date. A "hook" is a reusable piece of React
 * logic; components call it and redraw whenever the answer changes.
 *
 * Supabase tells us about every change: the saved session when the page
 * loads, signing in (including arriving from a magic link), token refreshes
 * and signing out.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(supabase ? { status: 'loading' } : { status: 'signed-out' })

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? { status: 'signed-in', session } : { status: 'signed-out' })
    })
    return () => data.subscription.unsubscribe() // stop listening when the app closes
  }, [])

  return state
}
