import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders as render, screen } from '@/tests/helpers/render-with-providers'
import { OverviewView } from './overview-view'

// Mock the currency hook
vi.mock('@/lib/currency-context', () => ({
  useCurrency: () => ({
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  }),
}));

vi.mock('@/lib/contexts/app-context', () => ({
  useApp: () => ({
    state: {
      properties: [{ id: 'p1', name: 'One', status: 'occupied', bedrooms: 2, bathrooms: 1 }],
      tenants: [{ id: 't1', name: 'John', paymentStatus: 'paid', rent: 1000, leaseStart: new Date().toISOString(), leaseEnd: new Date().toISOString() }],
      receipts: [{ id: 'r1', tenantName: 'John', propertyName: 'One', amount: 1000, status: 'paid', type: 'rent', date: new Date().toISOString() }]
    }
  })
}))

describe('OverviewView', () => {
  it('renders dashboard overview and stats', () => {
    render(<OverviewView />)
    expect(screen.getByText(/Dashboard Overview/)).toBeDefined()
    expect(screen.getByText(/Total Properties/)).toBeDefined()
    // There are multiple "Monthly Revenue" texts - check that at least one exists
    const monthlyRevenueElements = screen.getAllByText(/Monthly Revenue/)
    expect(monthlyRevenueElements.length).toBeGreaterThan(0)
    // tolerate multiple matches for numeric stats — assert at least one exists
    const propertyTotals = screen.getAllByText('1')
    expect(propertyTotals.length).toBeGreaterThan(0)
    // Look for formatted currency amounts - could be $1000.00 or $1,000.00
    const amounts = screen.getAllByText(/\$1[,0]*\.?00/)
    expect(amounts.length).toBeGreaterThan(0)
  })
})

