/**
 * Data Mode Configuration
 * 
 * Determines whether the application uses mock data or real Prisma database.
 * 
 * Rules:
 * - Development (NODE_ENV=development):
 *   - Without DATABASE_URL: uses mock fixtures (read-only)
 *   - With DATABASE_URL: uses Prisma (full CRUD)
 * - Non-development (production/test/preview):
 *   - Requires DATABASE_URL, fails fast if missing
 *   - Always uses Prisma
 */

export type DataMode = 'mock' | 'real';

/**
 * Check if running in local development environment
 */
export const isLocalDev = process.env.NODE_ENV === 'development';

/**
 * Check if DATABASE_URL is configured
 */
export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

/**
 * Determine the current data mode based on environment
 */
export const dataMode: DataMode = (() => {
  // Development without DATABASE_URL → mock
  if (isLocalDev && !hasDatabaseUrl) {
    return 'mock';
  }
  
  // Development with DATABASE_URL → real
  if (isLocalDev && hasDatabaseUrl) {
    return 'real';
  }
  
  // Non-development requires DATABASE_URL (except test environment)
  const isTestEnv = process.env.NODE_ENV === 'test';
  if (!isLocalDev && !hasDatabaseUrl && !isTestEnv) {
    throw new Error(
      `DATABASE_URL is required in ${process.env.NODE_ENV} environment. ` +
      'Please set DATABASE_URL to a valid database connection string.'
    );
  }
  
  // Non-development with DATABASE_URL → real
  return 'real';
})();

/**
 * Check if currently using real database
 */
export const isRealMode = dataMode === 'real';

/**
 * Check if currently using mock data
 */
export const isMockMode = dataMode === 'mock';

/**
 * Get a human-readable description of current mode
 */
export function getDataModeDescription(): string {
  if (isMockMode) {
    return 'Mock data (read-only fixtures)';
  }
  return `Real database (${process.env.DATABASE_URL?.split('@')[0] || 'Prisma'})`;
}

// Log current mode on module load (server-side only)
if (typeof window === 'undefined') {
  console.log(`[Data Mode] ${dataMode.toUpperCase()}: ${getDataModeDescription()}`);
}
