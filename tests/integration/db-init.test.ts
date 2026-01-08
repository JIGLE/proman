import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'

describe('integration: sqlite db init', () => {
  const dbPath = './ci-test.db'
  const dbUrl = `file:${dbPath}`

  beforeEach(() => {
    // Ensure clean env and module cache
    vi.resetModules()
    process.env.DATABASE_URL = dbUrl
    // Remove existing db file
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
    } catch {
      // ignore
    }
  })

  afterEach(() => {
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
    } catch {
      // ignore
    }
    delete process.env.DATABASE_URL
    vi.restoreAllMocks()
  })

  it('creates sqlite file and responds ok on POST /api/debug/db/init', async () => {
    // Mock execSync to avoid running prisma in the test environment. Use vi.mock at module scope before we import the route.
    vi.mock('child_process', async (importOriginal) => {
      const actual = await importOriginal()
      return { default: actual, ...actual, execSync: () => Buffer.from('ok') }
    })

    // Dynamically import the route module using an absolute file URL to avoid Vite import resolution issues
    const { pathToFileURL } = await import('url')
    const path = require('path').resolve(process.cwd(), 'app/api/debug/db/init/route.ts')
    const module = await import(pathToFileURL(path).href)
    const res = await module.POST(new Request('http://localhost', { method: 'POST' }))
    const body = await res.json()
    console.log('integration body:', body)

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('ok', true)
    // DB file should be present
    expect(fs.existsSync(dbPath)).toBe(true)
  })
})