import { describe, it, expect } from 'vitest'
import { renderWithProviders as render } from '../helpers/render-with-providers'
import { Separator } from '../../components/ui/separator'

describe('Separator component', () => {
  it('renders horizontal by default', () => {
    const { container } = render(<Separator />)
    expect(container.firstChild).toBeDefined()
  })

  it('renders vertical when orientation set', () => {
    const { container } = render(<Separator orientation="vertical" />)
    expect(container.firstChild).toBeDefined()
  })
})
