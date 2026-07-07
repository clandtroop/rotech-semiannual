import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/rotech-semiannual/',
  server: {
    port: 5173,
  }
})
