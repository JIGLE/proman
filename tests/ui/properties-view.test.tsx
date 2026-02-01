import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import { PropertiesView } from '../../components/properties-view'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/properties',
}));

// Mock the currency hook
vi.mock('../../lib/currency-context', () => ({
  useCurrency: () => ({
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  }),
}));

vi.mock('@/lib/contexts/app-context', () => ({
  useApp: () => ({
    state: { properties: [], loading: false },
    addProperty: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
  })
}))

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

describe('PropertiesView', () => {
  it('shows empty state when no properties', () => {
    render(<PropertiesView />)
    expect(screen.getByText(/No properties yet/)).toBeDefined()
  })
})
