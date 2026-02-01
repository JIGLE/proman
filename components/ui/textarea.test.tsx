import { describe, it, expect } from 'vitest'
import { renderWithProviders as render, screen } from '@/tests/helpers/render-with-providers'
import { Textarea } from './textarea'

describe('Textarea component', () => {
  it('renders with placeholder and value', () => {
    render(<Textarea placeholder="Notes" value="hello" />)
    const el = screen.getByPlaceholderText('Notes') as HTMLTextAreaElement
    expect(el.value).toBe('hello')
  })

  it('accepts className', () => {
    render(<Textarea className="ta" />)
    const el = document.querySelector('.ta')
    expect(el).toBeDefined()
  })
})

