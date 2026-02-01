import { describe, it, expect } from 'vitest'
import { renderWithProviders as render, screen } from '@/tests/helpers/render-with-providers'
import { Input } from './input'

describe('Input component', () => {
  it('renders with placeholder and value', () => {
    render(<Input placeholder="Email" value="test@example.com" />)
    const input = screen.getByPlaceholderText('Email') as HTMLInputElement
    expect(input).toBeDefined()
    expect(input.value).toBe('test@example.com')
  })

  it('accepts className prop', () => {
    render(<Input className="my-input" />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.className).toContain('my-input')
  })
})

