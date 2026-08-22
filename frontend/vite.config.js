import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /api → FlexTag backend (PORT in backend/.env)
      // Note: services/api.js uses an absolute baseURL (API_URL), so this proxy
      // is only used by any code that calls a bare /api/... path.
      '/api': {
        target: 'http://localhost:1643',
        changeOrigin: true,
      },
      // Forward /scrape → Python Flask bot server (backend/routes/admin.js
      // proxies to the same port).
      '/scrape': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
