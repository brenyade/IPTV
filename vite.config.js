import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During `npm run dev`, the Express API runs on :5174 and Vite dev server on :5173.
// We proxy /api to the backend so playlist/Xtream fetching bypasses browser CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5174'
    }
  },
  build: {
    outDir: 'dist'
  }
})
