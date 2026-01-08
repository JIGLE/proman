import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar'

describe('Avatar component', () => {
  it('renders image with alt text', () => {
    render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="User avatar" />
      </Avatar>
    )
    const img = screen.getByAltText('User avatar') as HTMLImageElement
    expect(img).toBeDefined()
    expect(img.src).toContain('/avatar.png')
  })

  it('renders fallback when image not present', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('AB')).toBeDefined()
  })
})