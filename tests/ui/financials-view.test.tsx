import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import { FinancialsView } from '../../components/financials-view'

// Mock the currency hook
vi.mock('../../lib/currency-context', () => ({
  useCurrency: () => ({
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  }),
}));

vi.mock('@/lib/app-context-db', () => ({
  useApp: () => ({
    state: { properties: [], receipts: [], expenses: [], loading: false },
    addExpense: vi.fn(),
  })
}))

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

describe('FinancialsView', () => {
  it('renders summary cards', () => {
    render(<FinancialsView />)
    expect(screen.getByText(/Financials/)).toBeDefined()
    expect(screen.getByText(/Total Income/)).toBeDefined()
  })
})
