import "./helpers/globals";
import { beforeEach, afterEach, vi } from "vitest";
import {
  setPrismaClientForTests,
  resetPrismaClientForTests,
} from "../lib/services/database/database";
import prismaMock from "./helpers/prisma-mock";
import "@testing-library/jest-dom/vitest";

// Use an explicit render helper for tests that need Intl / Currency contexts.
// Tests should import `renderWithProviders` from `tests/helpers/render-with-providers`.

// Global mocks for Next.js modules
// These are applied to all tests to avoid repetitive mocking in each test file
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/en/overview"),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  useParams: vi.fn(() => ({ locale: "en" })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-i18next for components that use `useTranslation`
import { readFileSync } from "fs";
import { resolve } from "path";
import * as React from 'react';

let commonTranslations: Record<string, any> = {};
try {
  const p = resolve(__dirname, "..", "public", "locales", "en", "common.json");
  commonTranslations = JSON.parse(readFileSync(p, "utf8"));
} catch (e) {
  // fallback to empty translations
  commonTranslations = {};
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const parts = key.split(".");
      let cur: any = commonTranslations;
      for (const p of parts) {
        if (cur && typeof cur === "object" && p in cur) cur = cur[p];
        else return key;
      }
      return typeof cur === "string" ? cur : key;
    },
    i18n: {
      changeLanguage: async () => {},
    },
  }),
}));

// Provide a lightweight mock for the app context so components can import it in tests
vi.mock("@/lib/app-context-db", () => {
  const AppContext = React.createContext(null);
  const AppProvider = ({ children }: { children: any }) => children;
  const useApp = () => {
    throw new Error('useApp must be used within an AppProvider');
  };
  return { AppContext, AppProvider, useApp };
});

// Mock currency context - used by many components
vi.mock("@/lib/contexts/currency-context", () => ({
  useCurrency: () => ({
    currency: "USD",
    setCurrency: vi.fn(),
    formatCurrency: (amount: number) => `$${amount?.toFixed(2) ?? "0.00"}`,
    locale: "en",
  }),
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock toast context - used by many components
vi.mock("@/lib/contexts/toast-context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock theme context
vi.mock("@/lib/contexts/theme-context", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    systemTheme: "light",
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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
