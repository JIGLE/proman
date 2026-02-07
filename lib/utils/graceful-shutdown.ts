/**
 * Graceful Shutdown Handler
 *
 * Ensures the application cleans up resources (e.g., closes DB connections,
 * drains in-flight requests) when receiving SIGTERM or SIGINT.
 *
 * Usage (in server.js or a custom server entry):
 *   import { registerShutdownHandlers } from '@/lib/utils/graceful-shutdown'
 *   const server = app.listen(port)
 *   registerShutdownHandlers(server)
 *
 * For Next.js standalone mode (default), Next.js handles shutdown internally.
 * This utility is provided for custom server setups or additional cleanup hooks.
 */

import { logger } from './logger'

type CleanupFn = () => void | Promise<void>

const cleanupFns: CleanupFn[] = []
let isShuttingDown = false

/**
 * Register a cleanup function to run during shutdown.
 * Functions are called in LIFO order (last registered runs first).
 */
export function onShutdown(fn: CleanupFn): void {
  cleanupFns.unshift(fn)
}

/**
 * Perform graceful shutdown: run all cleanup functions and exit.
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info(`Received ${signal}. Starting graceful shutdown...`)

  const timeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 30s. Forcing exit.')
    process.exit(1)
  }, 30_000)

  for (const fn of cleanupFns) {
    try {
      await fn()
    } catch (err) {
      logger.error('Error during cleanup', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  clearTimeout(timeout)
  logger.info('Graceful shutdown complete.')
  process.exit(0)
}

/**
 * Register SIGTERM/SIGINT handlers. Optionally pass an HTTP server
 * to close during shutdown.
 */
export function registerShutdownHandlers(
  server?: { close: (cb?: (err?: Error) => void) => void }
): void {
  if (server) {
    onShutdown(
      () =>
        new Promise<void>((resolve, reject) => {
          logger.info('Closing HTTP server...')
          server.close((err) => {
            if (err) {
              logger.error('Error closing server', { error: err.message })
              reject(err)
            } else {
              logger.info('HTTP server closed.')
              resolve()
            }
          })
        })
    )
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

export default { onShutdown, registerShutdownHandlers }
