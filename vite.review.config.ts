// Review copy: serves the app's real screens with fake storage and fake
// sign-in, so design reviews and screenshots never touch the real account.
// Run with: npm run review   (then open http://localhost:5174)
// It is never part of the real build, which only uses vite.config.ts.

import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const fakes: Record<string, string> = {
  '/src/lib/storage.ts': fileURLToPath(new URL('./review/fakeStorage.ts', import.meta.url)),
  '/src/lib/auth.ts': fileURLToPath(new URL('./review/fakeAuth.ts', import.meta.url)),
}

/** Wherever the app imports the real storage or auth module, hand it the fake instead. */
function swapInFakes(): Plugin {
  return {
    name: 'review-fakes',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolved) return null
      const id = resolved.id.replace(/\\/g, '/')
      for (const [realFile, fakeFile] of Object.entries(fakes)) {
        if (id.endsWith(realFile)) return fakeFile
      }
      return resolved
    },
  }
}

export default defineConfig({
  root: 'review',
  publicDir: '../public', // the real icons and favicon
  envDir: '..', // not needed by the fakes, but keeps Vite's settings lookup in the project folder
  plugins: [react(), swapInFakes()],
  server: { port: 5174, strictPort: true },
})
