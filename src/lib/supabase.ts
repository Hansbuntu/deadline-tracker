// The one connection to Supabase that the whole app shares.
// The URL and publishable key come from environment variables (.env.local on
// your laptop, Vercel's settings once deployed), never from the code itself.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** The names of any settings that are missing, so the app can say exactly what to fix. */
export const missingSettings = [
  !url && 'VITE_SUPABASE_URL',
  !publishableKey && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter((name): name is string => Boolean(name))

export const isSupabaseConfigured = missingSettings.length === 0

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null
