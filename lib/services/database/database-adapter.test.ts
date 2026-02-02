import { it, expect } from 'vitest';
import type { SqlDriverAdapterFactory } from '@prisma/driver-adapter-utils';

it('constructs PrismaClient with sqlite adapter factory', async () => {
  process.env.DATABASE_URL = 'file:./ci-test.db';
  const { PrismaClient } = await import('@prisma/client');
  const { createSqliteDriverAdapterFactory } = await import('@/lib/services/database/sqlite-adapter');
  const adapter: SqlDriverAdapterFactory = createSqliteDriverAdapterFactory(process.env.DATABASE_URL);
  const client = new PrismaClient({ adapter });
  expect(client).toBeDefined();
  await client.$disconnect();
});
