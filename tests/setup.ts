import './helpers/globals';
import { beforeEach, afterEach, vi } from 'vitest';
import { setPrismaClientForTests, resetPrismaClientForTests } from '../lib/database';
import prismaMock from './helpers/prisma-mock';
import '@testing-library/jest-dom';

// Prefer an explicit render helper instead of globally patching @testing-library/react.
// This reduces test-side mutation and makes tests easier to reason about.
// Use `renderWithProviders` from `tests/helpers/render-with-providers` in tests that
// need the intl and currency contexts.

// For compatibility with existing tests that import `render` from
// `@testing-library/react`, provide a lightweight mock that delegates to
// our explicit `renderWithProviders` helper. This keeps test files unchanged
// while avoiding complex inline provider wiring.
vi.mock('@testing-library/react', async () => {
  const actual = await vi.importActual('@testing-library/react');
  const helper = await vi.importActual('./helpers/render-with-providers');
  return {
    ...actual,
    render: helper.renderWithProviders,
  };
});

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
