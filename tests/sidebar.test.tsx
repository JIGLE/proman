import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../components/sidebar'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Alice', email: 'a@example.com', image: '/a.png' } } }),
  signOut: vi.fn(),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders menu and calls onTabChange when button clicked', () => {
    const onTabChange = vi.fn()
    render(<Sidebar activeTab="overview" onTabChange={onTabChange} />)

    const btn = screen.getByRole('button', { name: /Properties/i })
    fireEvent.click(btn)
    expect(onTabChange).toHaveBeenCalledWith('properties')
  })

  it('shows user info when session present', () => {
    const onTabChange = vi.fn()
    render(<Sidebar activeTab="overview" onTabChange={onTabChange} />)

    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('a@example.com')).toBeDefined()
  })
})