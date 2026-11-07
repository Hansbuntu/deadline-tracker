// The one connection to Supabase that the whole app shares.
// The URL and publishable key come from environment variables (.env.local on
// your laptop, Vercel's settings once deployed), never from the code itself.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** False until .env.local is filled in, so the app can say what's missing. */
export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null
