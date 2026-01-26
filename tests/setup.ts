import './helpers/globals';
import { beforeEach, afterEach, vi } from 'vitest';
import { setPrismaClientForTests, resetPrismaClientForTests } from '../lib/database';
import prismaMock from './helpers/prisma-mock';
import '@testing-library/jest-dom';

// Patch @testing-library/react so components render with necessary providers
// (intl messages and currency context) without editing each test file.
vi.mock('@testing-library/react', async () => {
  const actual = await vi.importActual('@testing-library/react');
  const React = (await vi.importActual('react')) as any;
  const nextIntl = await vi.importActual('next-intl');
  const enMessages = await vi.importActual('../messages/en.json');
  const currency = await vi.importActual('../lib/currency-context');

  const NextIntlClientProvider = nextIntl.NextIntlClientProvider || nextIntl.default?.NextIntlClientProvider;
  const CurrencyProvider = currency.CurrencyProvider || currency.default?.CurrencyProvider || currency;

  return {
    ...actual,
    render: (ui: any, options?: any) => {
      const wrapped = React.createElement(
        NextIntlClientProvider,
        { locale: 'en', messages: enMessages },
        React.createElement(CurrencyProvider, null, ui),
      );
      return (actual as any).render(wrapped, options);
    },
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
