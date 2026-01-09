import { describe, it, expect } from 'vitest';

it('constructs PrismaClient with sqlite adapter factory', async () => {
  process.env.DATABASE_URL = 'file:./ci-test.db';
  const { PrismaClient } = await import('@prisma/client');
  const { createSqliteDriverAdapterFactory } = await import('../lib/sqlite-adapter');
  const adapter = createSqliteDriverAdapterFactory(process.env.DATABASE_URL);
  const client = new PrismaClient({ adapter } as any);
  expect(client).toBeDefined();
  await client.$disconnect();
});
