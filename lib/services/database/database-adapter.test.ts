import { it, expect, describe } from "vitest";

// SQLite adapter tests are skipped after migration to PostgreSQL.
// The project now uses @prisma/adapter-pg for production and a mock for tests.
describe("database adapter", () => {
  it("PrismaClient can be imported", async () => {
    const { PrismaClient } = await import("@prisma/client");
    expect(PrismaClient).toBeDefined();
  });
});
