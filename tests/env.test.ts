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
    (process.env as any).NODE_ENV = 'test';
    clearEnvModule();
  });

  it('should not throw and provide defaults when NODE_ENV=test', async () => {
    const mod = await import('../lib/env');
    const { env } = mod as { env: any };
    expect(env.NODE_ENV).toBe('test');
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.NEXTAUTH_SECRET).toBeDefined();
  });
});