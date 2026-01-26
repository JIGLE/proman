import '@testing-library/jest-dom'
import './helpers/env'
import React from 'react'
import { afterEach, vi } from 'vitest'
import { CurrencyProvider } from '@/lib/currency-context'
import { NextIntlClientProvider } from 'next-intl'
import { setPrismaClientForTests, resetPrismaClientForTests } from '@/lib/database'
import { createMinimalPrismaMock } from './helpers/prisma-mock'

// Mock @testing-library/react synchronously so tests that import `render`
// directly receive a wrapped version that provides the CurrencyProvider.
// Use `eval('require')` to synchronously load the actual module so we can
// return a patched object from the mock factory (avoids async factory issues
// with the test runner's transform).
vi.mock('@testing-library/react', () => {
  // eslint-disable-next-line no-eval
  const actual = eval("require")('@testing-library/react')
  const originalRender = actual.render
  // Load english messages synchronously for the test environment
  // eslint-disable-next-line no-eval
  const messages = eval("require")('../messages/en.json')

  function customRender(ui: React.ReactElement, options: Record<string, unknown> = {}) {
    return originalRender(ui, {
      wrapper: ({ children }: any) => React.createElement(NextIntlClientProvider as any, { locale: 'en', messages }, React.createElement(CurrencyProvider, null, children)),
      ...(options as any),
    } as any)
  }

  // expose cleanup on global to be used by afterEach below
  ;(globalThis as any).__rtl_cleanup = actual.cleanup

  return {
    ...actual,
    render: customRender,
  }
})

// Use the real cleanup implementation after each test
afterEach(() => {
  const cleanupFn = (globalThis as any).__rtl_cleanup
  if (typeof cleanupFn === 'function') cleanupFn()
  // Reset any Prisma client injection between tests
  try {
    resetPrismaClientForTests()
  } catch {}
})

// no explicit exports needed from setup

// Inject a minimal Prisma mock by default so modules that call getPrismaClient()
// during tests can operate without the real DB. Individual tests can replace
// this by calling setPrismaClientForTests with a different mock or real client.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, no-eval
  const env = process.env.NODE_ENV
  if (!process.env.DATABASE_URL) {
    setPrismaClientForTests(createMinimalPrismaMock() as any)
  }
} catch (err) {
  // best-effort; tests should still run even if injection fails
}
