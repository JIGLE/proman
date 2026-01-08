import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OverviewView } from '../../components/overview-view'

vi.mock('@/lib/app-context', () => ({
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
    expect(screen.getByText(/Monthly Revenue/)).toBeDefined()
    // tolerate multiple matches for numeric stats — assert at least one exists
    const propertyTotals = screen.getAllByText('1')
    expect(propertyTotals.length).toBeGreaterThan(0)
    const amounts = screen.getAllByText(/\$1,000/)
    expect(amounts.length).toBeGreaterThan(0)
  })
})