import './helpers/globals';
import { beforeEach, afterEach, vi } from 'vitest';
import { setPrismaClientForTests, resetPrismaClientForTests } from '../lib/database';
import prismaMock from './helpers/prisma-mock';
import '@testing-library/jest-dom';

// Prefer an explicit render helper instead of globally patching @testing-library/react.
// This reduces test-side mutation and makes tests easier to reason about.
// Use `renderWithProviders` from `tests/helpers/render-with-providers` in tests that
// need the intl and currency contexts.

// Prefer explicit use of `renderWithProviders` from
// `tests/helpers/render-with-providers` in tests that need the intl and
// currency contexts. We previously provided a compatibility mock for
// `@testing-library/react` here, but importing the helper at module scope
// caused an import cycle in some worker orders. Tests in this branch are
// being migrated to import `renderWithProviders` directly; remove the
// compatibility shim to keep the test environment simple.

// Inject our minimal Prisma mock when DATABASE_URL is not set. This keeps tests
// hermetic and avoids requiring a sqlite file for every run.
if (!process.env.DATABASE_URL) {
  setPrismaClientForTests(prismaMock as any);
}

beforeEach(() => {
  // Reset the in-memory mock to keep tests isolated.
  if ((prismaMock as any).__reset) (prismaMock as any).__reset();
});

afterEach(() => {
  // Keep the injected mock available for the worker lifetime; tests may reset
  // or override it if needed. We still call resetPrismaClientForTests to be
  // safe in case a test replaced the client.
  try {
    resetPrismaClientForTests();
  } catch {}
});

// Note: the test harness also patches @testing-library/react in a separate file
// so that components render with necessary providers (intl, currency). Keep this
// file minimal — tests import it via vitest config `setupFiles`.
