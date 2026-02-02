/**
 * Shared test mocks for Next.js and application contexts
 * 
 * This file provides standardized mocks that can be imported across test files
 * to avoid duplication and ensure consistency.
 */

import { vi } from 'vitest'

/**
 * Mock for next/navigation
 * Provides default implementations of Next.js navigation hooks
 */
export const mockNextNavigation = () => {
  return vi.mock('next/navigation', () => ({
    usePathname: () => '/en/overview',
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    useParams: () => ({ locale: 'en' }),
    useSearchParams: () => new URLSearchParams(),
  }))
}

/**
 * Mock for next-intl
 * Provides basic translation mock that returns the key as the translation
 */
export const mockNextIntl = () => {
  return vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  }))
}

/**
 * Mock for next-auth/react
 * Provides authenticated session mock
 */
export const mockNextAuth = (user = { name: 'Test User', email: 'test@example.com' }) => {
  return vi.mock('next-auth/react', () => ({
    useSession: () => ({ 
      data: { user }, 
      status: 'authenticated' 
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }))
}

/**
 * Mock for currency context
 * Provides basic currency formatting
 */
export const mockCurrencyContext = () => {
  return vi.mock('@/lib/contexts/currency-context', () => ({
    useCurrency: () => ({
      formatCurrency: (amount: number | undefined) => 
        amount !== undefined ? `$${amount.toFixed(2)}` : '$0.00',
      currency: 'USD',
      locale: 'en-US',
    }),
  }))
}

/**
 * Mock for toast context
 * Provides toast notification functions
 */
export const mockToastContext = () => {
  return vi.mock('@/lib/contexts/toast-context', () => ({
    useToast: () => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }),
  }))
}

/**
 * Mock for theme context
 * Provides theme state and toggle function
 */
export const mockThemeContext = (theme: 'light' | 'dark' = 'light') => {
  return vi.mock('@/lib/contexts/theme-context', () => ({
    useTheme: () => ({
      theme,
      setTheme: vi.fn(),
      systemTheme: theme,
    }),
  }))
}

/**
 * Mock for app context
 * Provides empty application state
 */
export const mockAppContext = (state = {}) => {
  return vi.mock('@/lib/contexts/app-context', () => ({
    useApp: () => ({
      state: {
        properties: [],
        tenants: [],
        receipts: [],
        expenses: [],
        leases: [],
        templates: [],
        correspondence: [],
        loading: false,
        ...state,
      },
      addProperty: vi.fn(),
      updateProperty: vi.fn(),
      deleteProperty: vi.fn(),
      addTenant: vi.fn(),
      updateTenant: vi.fn(),
      deleteTenant: vi.fn(),
      addReceipt: vi.fn(),
      updateReceipt: vi.fn(),
      deleteReceipt: vi.fn(),
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
    }),
  }))
}

/**
 * Setup all common mocks at once
 * Use this in tests that need most of the standard mocks
 */
export const setupCommonMocks = () => {
  mockNextNavigation()
  mockNextIntl()
  mockCurrencyContext()
  mockToastContext()
  mockThemeContext()
  mockAppContext()
}
