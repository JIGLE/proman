import { describe, it, expect } from 'vitest'
import { renderWithProviders as render, screen } from '../helpers/render-with-providers'
import { Label } from '../../components/ui/label'

describe('Label component', () => {
  it('renders children and applies className', () => {
    render(<Label className="lbl">Name</Label>)
    expect(screen.getByText('Name')).toBeDefined()
    const el = document.querySelector('.lbl')
    expect(el).toBeDefined()
  })
})
