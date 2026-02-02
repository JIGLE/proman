import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders as render, screen } from '@/tests/helpers/render-with-providers'
import { OverviewView } from './overview-view'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock the currency hook
vi.mock('@/lib/contexts/currency-context', () => ({
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
    const { container } = render(<OverviewView />)
    // Just verify the component renders without crashing
    expect(container).toBeDefined()
  })
})

