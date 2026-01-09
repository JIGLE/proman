import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'

// Skip integration test when DATABASE_URL is not configured (runs in CI job where DATABASE_URL is set)
const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
  // Export a skipped suite
  describe.skip('integration: create property (skipped)', () => {})
} else {
  describe('integration: create property', () => {
    const dbPath = dbUrl.replace(/^file:\/\//, '').replace(/^file:/, '')

    beforeEach(() => {
      // Ensure module cache reset so auth mock is applied correctly
      vi.resetModules()
    })

    it('creates a property via POST /api/properties and is retrievable via GET', async () => {
      // Mock auth middleware to return a fixed userId for the request
      vi.mock('@/lib/auth-middleware', () => ({
        requireAuth: async () => ({ userId: 'integration-user' }),
        handleOptions: () => new Response(null, { status: 200 })
      }))

      const { pathToFileURL } = await import('url')
      const path = require('path').resolve(process.cwd(), 'app/api/properties/route.ts')
      const routeModule = await import(pathToFileURL(path).href)

      const payload = {
        name: 'Integration Property',
        address: '123 Test St',
        type: 'house',
        bedrooms: 2,
        bathrooms: 1,
        rent: 1200,
      }

      const req = new Request('http://localhost/api/properties', { method: 'POST', body: JSON.stringify(payload) })
      const postRes = await routeModule.POST(req)
      const postBody = await postRes.json()

      expect(postRes.status).toBe(201)
      expect(postBody).toHaveProperty('data')
      expect(postBody.data).toHaveProperty('id')
      expect(postBody.data.name).toBe(payload.name)

      // Now call GET to ensure the created property shows up
      const getReq = new Request('http://localhost/api/properties', { method: 'GET' })
      const getRes = await routeModule.GET(getReq)
      const getBody = await getRes.json()

      expect(getRes.status).toBe(200)
      const items: Array<{ name?: string }> = getBody.data
      expect(items.some(p => p.name === payload.name)).toBe(true)

      // Cleanup: remove DB file only if it's a job-scoped CI DB; do not remove shared files
      try {
        if (dbPath.includes('ci-') && fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      } catch {
        // ignore cleanup errors
      }
    })
  })
}
