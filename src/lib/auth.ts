// Signing in and out. Every call to Supabase's login system goes through
// here, so the rest of the app never touches it directly.

import { friendlyAuthError } from './authMessages.ts'
import { supabase } from './supabase.ts'

function client() {
  if (!supabase) throw new Error('The app isn’t connected to Supabase yet (see .env.example).')
  return supabase
}

/**
 * Email a magic link (and a one-time code) to this address.
 * The link brings you back to whatever address the app is running on; Supabase
 * only allows addresses on its "Redirect URLs" list.
 */
export async function sendSignInEmail(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw new Error(friendlyAuthError(error))
}

/** Sign in with the code from the email instead of the link. */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const { error } = await client().auth.verifyOtp({ email: email.trim(), token: code, type: 'email' })
  if (error) throw new Error(friendlyAuthError(error))
}

export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut()
  if (error) throw new Error(friendlyAuthError(error))
}
