import { describe, it, expect } from 'vitest'
import { renderWithProviders as render, screen } from '@/tests/helpers/render-with-providers'
import { Button } from './button'

describe('Button component', () => {
  it('renders children and applies variant classes', () => {
    render(<Button variant="outline">Click me</Button>)
    const btn = screen.getByRole('button', { name: /click me/i })
    expect(btn).toBeDefined()
    // outline variant includes a border class
    expect(btn.className).toMatch(/border/)
  })

  it('supports className and size', () => {
    render(
      <Button className="custom-class" size="sm">
        Small
      </Button>
    )
    const btn = screen.getByRole('button', { name: /small/i })
    expect(btn.className).toContain('custom-class')
    expect(btn.className).toMatch(/h-8/)
  })
})

