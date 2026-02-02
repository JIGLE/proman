import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders as render, screen } from '@/tests/helpers/render-with-providers'
import VersionBadge, { VersionInfo } from './version-badge'

describe('VersionBadge', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    // @ts-ignore
    global.fetch = fetchMock
  })

  afterEach(() => {
    // @ts-ignore
    delete global.fetch
  })

  it('renders nothing when fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('nope'))
    render(<VersionBadge />)
    // nothing should be rendered
    expect(document.body.textContent).toBe('')
  })

  it('renders version when fetch succeeds', async () => {
    const data: VersionInfo = { version: '1.2.3', git_commit: 'abcdef' }
    fetchMock.mockResolvedValueOnce({ json: async () => data })
    render(<VersionBadge />)
    // wait for effect to run - simple check for the version text
    expect(await screen.findByText(/v1.2.3/)).toBeDefined()
  })
})
