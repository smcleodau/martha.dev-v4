import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 21004,
    allowedHosts: ['martha.arch.ie'],
    proxy: {
      '/api': {
        target: 'http://localhost:21000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:21000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:21000',
        ws: true,
      },
    },
  },
})
