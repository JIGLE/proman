import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TenantsView } from '../../components/tenants-view'

vi.mock('@/lib/app-context-db', () => ({
  useApp: () => ({
    state: { tenants: [], properties: [], loading: false },
    addTenant: vi.fn(),
    updateTenant: vi.fn(),
    deleteTenant: vi.fn(),
  })
}))

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

describe('TenantsView', () => {
  it('renders empty state when no tenants', () => {
    render(<TenantsView />)
    expect(screen.getByText(/No tenants yet/)).toBeDefined()
  })
})