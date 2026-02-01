import { describe, it, expect } from 'vitest'
import { renderWithProviders as render, screen } from '@/tests/helpers/render-with-providers'
import { Avatar, AvatarFallback } from './avatar'

describe('Avatar component', () => {
  it('applies className to root Avatar', () => {
    render(<Avatar className="my-avatar">{null}</Avatar>)
    const root = document.querySelector('.my-avatar')
    expect(root).toBeDefined()
  })

  it('renders fallback when image not present', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('renders image when provided', () => {
    render(
      <Avatar>
        <img src="/avatar.png" alt="User avatar" />
      </Avatar>
    )
    const img = screen.getByAltText('User avatar')
    expect(img).toBeInTheDocument()
  })
})

