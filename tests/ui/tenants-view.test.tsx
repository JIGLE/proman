import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import { TenantsView } from '@/components/features/tenant/tenants-view'

// Mock the currency hook
vi.mock('@/lib/contexts/currency-context', () => ({
  useCurrency: () => ({
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  }),
}));

vi.mock('@/lib/contexts/app-context', () => ({
  useApp: () => ({
    state: { tenants: [], properties: [], loading: false },
    addTenant: vi.fn(),
    updateTenant: vi.fn(),
    deleteTenant: vi.fn(),
  })
}))

vi.mock('@/lib/contexts/toast-context', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

describe('TenantsView', () => {
  it('renders empty state when no tenants', () => {
    render(<TenantsView />)
    expect(screen.getByText(/No tenants yet/)).toBeDefined()
  })
})
