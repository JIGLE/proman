import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReceiptsView } from '../../components/receipts-view'

vi.mock('@/lib/app-context-db', () => ({
  useApp: () => ({
    state: { receipts: [], tenants: [], properties: [], loading: false },
    addReceipt: vi.fn(),
    updateReceipt: vi.fn(),
    deleteReceipt: vi.fn(),
  })
}))

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

describe('ReceiptsView', () => {
  it('renders empty receipts state', () => {
    render(<ReceiptsView />)
    expect(screen.getByText(/No receipts yet/)).toBeDefined()
  })
})