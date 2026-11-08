// Makes the home-screen icons from public/favicon.svg.
// Run with: npm run icons   (the PNGs it writes to public/ are committed)
//
// Phones need PNG files in fixed sizes:
// - "any" icons (64, 192, 512 px) for Android, Chrome and Windows
// - a "maskable" icon: Android crops icons into circles, squircles etc., so
//   the artwork sits in the middle with extra padding (the "safe zone")
// - an Apple touch icon (180 px) for iPhone and iPad home screens
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const galleryBlack = '#18181b' // same as the icon's square, so padding blends in

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: galleryBlack } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: galleryBlack } },
  },
  images: ['public/favicon.svg'],
})
