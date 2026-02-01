import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders as render, screen, fireEvent } from './helpers/render-with-providers'
import { Sidebar } from '../components/sidebar'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Alice', email: 'a@example.com', image: '/a.png' } } }),
  signOut: vi.fn(),
}))

vi.mock('../lib/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    systemTheme: 'light',
  }),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders menu and calls onTabChange when button clicked', () => {
    const onTabChange = vi.fn()
    render(<Sidebar activeTab="overview" onTabChange={onTabChange} />)

    // Find the button by its text content and click it
    const btn = screen.getByText('Properties').closest('button')!
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
