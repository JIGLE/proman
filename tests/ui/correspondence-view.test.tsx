import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import { CorrespondenceView } from '../../components/correspondence-view'

vi.mock('@/lib/contexts/app-context', () => ({
  useApp: () => ({
    state: { templates: [], correspondence: [], tenants: [], loading: false },
    addTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    addCorrespondence: vi.fn(),
  })
}))

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

describe('CorrespondenceView', () => {
  it('shows empty templates state', () => {
    render(<CorrespondenceView />)
    expect(screen.getByText(/No templates yet/)).toBeDefined()
  })
})
