import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '@/ui': fileURLToPath(new URL('./components/ui', import.meta.url)),
      '@/features': fileURLToPath(new URL('./components/features', import.meta.url)),
      '@/services': fileURLToPath(new URL('./lib/services', import.meta.url)),
      '@/hooks': fileURLToPath(new URL('./lib/hooks', import.meta.url)),
      '@/utils': fileURLToPath(new URL('./lib/utils', import.meta.url)),
      '@/schemas': fileURLToPath(new URL('./lib/schemas', import.meta.url)),
      '@/shared': fileURLToPath(new URL('./components/shared', import.meta.url)),
      '@/layouts': fileURLToPath(new URL('./components/layouts', import.meta.url)),
      '@/types': fileURLToPath(new URL('./types', import.meta.url)),
      '@/api': fileURLToPath(new URL('./app/api', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}', // Keep existing tests/ directory for helpers
      'tests/**/*.spec.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/e2e/**', // Exclude Playwright e2e tests
      '**/playwright/**'
    ]
  },
})
