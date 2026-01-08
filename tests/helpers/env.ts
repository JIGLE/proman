// Test helper to snapshot and restore process.env and reset module cache between tests.
// This prevents tests that mutate process.env or import modules that read env at load-time
// from interfering with other tests.

let ORIGINAL_ENV: NodeJS.ProcessEnv

beforeEach(() => {
  ORIGINAL_ENV = { ...process.env }
  // Ensure modules re-evaluate on import so they pick up any env changes per test
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})
