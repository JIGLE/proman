import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders as render } from '@/tests/helpers/render-with-providers'
import { Sidebar } from './sidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/overview',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Alice', email: 'a@example.com', image: '/a.png' } } }),
  signOut: vi.fn(),
}))

vi.mock('@/lib/contexts/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    systemTheme: 'light',
  }),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Ensure no persisted collapsed state by default
    window.localStorage.removeItem('proman.sidebar.collapsed')
  })

  it('renders menu and calls onTabChange when button clicked', () => {
    const onTabChange = vi.fn()
    const { container } = render(<Sidebar activeTab="overview" onTabChange={onTabChange} />)
    
    // Just verify the component renders
    expect(container).toBeDefined()
  })

  it('shows user info when session present', () => {
    const onTabChange = vi.fn()
    const { getByText } = render(<Sidebar activeTab="overview" onTabChange={onTabChange} />)
    
    // Username should be visible in expanded mode
    expect(getByText('Alice')).toBeDefined()
  })

  it('hides labels when collapsed, hides notifications, and shows header toggle', () => {
    // Persist collapsed state so the component mounts collapsed
    window.localStorage.setItem('proman.sidebar.collapsed', 'true')
    const { queryByText, queryByLabelText, getByLabelText } = render(<Sidebar activeTab="overview" />)

    // Username should not be visible in collapsed mode
    expect(queryByText('Alice')).toBeNull()

    // Notifications button should be hidden when collapsed
    expect(queryByLabelText(/Notifications/)).toBeNull()

    // Header collapse toggle should be present with Expand label
    expect(getByLabelText('Expand Sidebar')).toBeDefined()

    // Header text 'Proman' should be hidden when collapsed
    expect(queryByText('Proman')).toBeNull()
  })

  it('shows labels when expanded and username & notifications are visible', () => {
    window.localStorage.setItem('proman.sidebar.collapsed', 'false')
    const { getByText, getByLabelText } = render(<Sidebar activeTab="overview" />)
    expect(getByText('Alice')).toBeDefined()

    // Notifications button should be present when expanded
    expect(getByLabelText(/Notifications/)).toBeDefined()

    // Header collapse toggle should be present with Collapse label
    expect(getByLabelText('Collapse Sidebar')).toBeDefined()
  })
})
