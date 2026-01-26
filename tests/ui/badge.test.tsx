import { describe, it, expect } from 'vitest'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import { Badge } from '../../components/ui/badge'

describe('Badge component', () => {
  it('renders children and variant class', () => {
    render(<Badge variant="success">OK</Badge>)
    expect(screen.getByText('OK')).toBeDefined()
    const el = screen.getByText('OK')
    expect(el.className).toMatch(/bg-green-500|bg-green-900/)
  })
})
