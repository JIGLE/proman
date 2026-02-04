import { describe, it, beforeEach, expect } from 'vitest';

function clearEnvModule() {
  // Remove any cached module entries that reference lib/env to ensure dynamic imports pick up env changes
  if (typeof require !== 'undefined' && require.cache) {
    Object.keys(require.cache).forEach((key) => {
      if (key.endsWith('/lib/env.js') || key.endsWith('/lib/env.ts') || key.includes('/lib/env')) {
        delete require.cache[key];
      }
    });
  }
}

describe('env behavior', () => {
  beforeEach(() => {
    // Clear any env changes
    delete process.env.DATABASE_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXTAUTH_SECRET;
    (process.env as Partial<Record<string, string>>).NODE_ENV = 'test';
    clearEnvModule();
  });

  it('should not throw and provide defaults when NODE_ENV=test', async () => {
    const mod = await import('@/lib/utils/env');
    const { env } = mod as { env: { NODE_ENV: 'development' | 'production' | 'test'; DATABASE_URL?: string; NEXTAUTH_SECRET?: string; NEXTAUTH_URL?: string } };
    expect(env.NODE_ENV).toBe('test');
    // DATABASE_URL can be undefined in test mode (uses mock data)
    expect(env.NEXTAUTH_SECRET).toBeDefined();
    expect(env.NEXTAUTH_URL).toBeDefined();
  });
});