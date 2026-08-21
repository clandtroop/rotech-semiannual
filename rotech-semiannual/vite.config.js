import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the app under /rotech-semiannual/; hosted builds
  // (Netlify / Cloudflare Pages via the root package.json) serve it at the
  // domain root and override this with VITE_BASE=/.
  base: process.env.VITE_BASE || '/rotech-semiannual/',
  server: {
    port: 5173,
  }
})
