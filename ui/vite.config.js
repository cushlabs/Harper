import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api -> the Kogito service so the browser sees a same-origin URL.
// Override the backend with: HARPER_API=http://host:port npm run dev
const target = process.env.HARPER_API || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') }
    }
  }
})
