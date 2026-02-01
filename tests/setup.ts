import './helpers/globals';
import { beforeEach, afterEach } from 'vitest';
import { setPrismaClientForTests, resetPrismaClientForTests } from '../lib/services/database/database';
import prismaMock from './helpers/prisma-mock';
import '@testing-library/jest-dom';

// Use an explicit render helper for tests that need Intl / Currency contexts.
// Tests should import `renderWithProviders` from `tests/helpers/render-with-providers`.

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
  // safe in case a test replaced the client during a test.
  try {
    resetPrismaClientForTests();
  } catch {}
});
