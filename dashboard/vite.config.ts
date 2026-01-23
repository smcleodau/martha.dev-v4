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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/USAGE_EXAMPLE.tsx',
        '**/example.tsx',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
})
