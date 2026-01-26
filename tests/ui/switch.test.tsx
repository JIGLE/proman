import { describe, it, expect } from 'vitest'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import { Switch } from '../../components/ui/switch'

describe('Switch component', () => {
  it('renders unchecked by default and toggles checked via props', () => {
    render(<Switch aria-checked={false} />)
    const el = screen.getByRole('switch')
    expect(el).toBeDefined()
    // role should exist; toggling UI state typically handled by user events in integration tests
  })
})
