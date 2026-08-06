import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /scrape → Python Flask bot server on port 5000
      '/scrape': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
