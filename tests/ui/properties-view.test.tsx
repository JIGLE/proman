import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PropertiesView } from '../../components/properties-view'

vi.mock('@/lib/app-context-db', () => ({
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