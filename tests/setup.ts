import './helpers/globals';
import { beforeEach, afterEach, vi } from 'vitest';
import { setPrismaClientForTests, resetPrismaClientForTests } from '../lib/services/database/database';
import prismaMock from './helpers/prisma-mock';
import '@testing-library/jest-dom';

// Use an explicit render helper for tests that need Intl / Currency contexts.
// Tests should import `renderWithProviders` from `tests/helpers/render-with-providers`.

// Global mocks for Next.js modules
// These are applied to all tests to avoid repetitive mocking in each test file
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/en/overview'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  useParams: vi.fn(() => ({ locale: 'en' })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock currency context - used by many components
vi.mock('@/lib/contexts/currency-context', () => ({
  useCurrency: () => ({
    currency: 'USD',
    setCurrency: vi.fn(),
    formatCurrency: (amount: number) => `$${amount?.toFixed(2) ?? '0.00'}`,
    locale: 'en',
  }),
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock toast context - used by many components
vi.mock('@/lib/contexts/toast-context', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock theme context
vi.mock('@/lib/contexts/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    systemTheme: 'light',
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}))

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
