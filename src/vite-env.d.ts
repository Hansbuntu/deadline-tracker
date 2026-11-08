/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// Tells TypeScript which environment variables exist (see .env.example).
// They are optional: the app should explain what's missing instead of crashing.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
