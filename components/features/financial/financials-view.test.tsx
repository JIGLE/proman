import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders as render, screen } from '@/tests/helpers/render-with-providers'
import { FinancialsView } from './financials-view'

// Mock the currency hook
vi.mock('@/lib/currency-context', () => ({
  useCurrency: () => ({
    formatCurrency: (amount: number | undefined) => 
      amount !== undefined ? `$${amount.toFixed(2)}` : '$0.00',
  }),
}));

vi.mock('@/lib/contexts/app-context', () => ({
  useApp: () => ({
    state: { 
      properties: [], 
      receipts: [], 
      expenses: [], 
      loading: false,
      metrics: {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        filteredReceipts: [],
        filteredExpenses: []
      }
    },
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

