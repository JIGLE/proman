import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FinancialsView } from '../../components/financials-view'

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