import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Jacana HRMS UI — serves the backend under /api/v1 (proxied in dev so the
// browser sees same-origin requests; no CORS changes needed on the API).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:5099',
        changeOrigin: true,
      },
      // SignalR notifications hub (WebSocket) — proxy like the REST API.
      '/hubs': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:5099',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
