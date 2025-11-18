import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/__tests__/e2e/**', // Exclude Playwright E2E tests
      '**/*.spec.ts', // Exclude all .spec.ts files (Playwright convention)
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'test/**',
        '*.config.*',
        'prisma/**',
        'components/ui/**', // UI components are third-party
      ],
    },
    globals: true,
    css: false, // Disable CSS processing in tests
  },
})
