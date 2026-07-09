import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Schema-level proof for the M1.3 additions: the new ProductEvent model and
 * UserSettings.onboardingDismissedAt field actually push and round-trip
 * against a real SQLite database, not just `prisma validate`/`generate`.
 * Mirrors lib/services/database/pii-extension.integration.test.ts's setup.
 */
describe("ProductEvent + UserSettings.onboardingDismissedAt — real Prisma client", () => {
  let tempDir: string;
  let dbUrl: string;

  beforeAll(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "proman-events-test-"));
    dbUrl = `file:${path.join(tempDir, "test.db")}`;

    execSync(`npx prisma db push --accept-data-loss --url="${dbUrl}"`, {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
    });

    process.env.DATABASE_URL = dbUrl;
  }, 60_000);

  afterAll(async () => {
    const { resetPrismaClientForTests } = await import("@/lib/services/database/database");
    resetPrismaClientForTests();
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates and reads back a ProductEvent row", async () => {
    const { getPrismaClient, resetPrismaClientForTests } = await import(
      "@/lib/services/database/database"
    );
    resetPrismaClientForTests();
    const prisma = getPrismaClient();

    const user = await prisma.user.create({
      data: { email: `events-test-${Date.now()}@example.com` },
    });

    const event = await prisma.productEvent.create({
      data: {
        userId: user.id,
        name: "reminder_clicked",
        metadata: JSON.stringify({ type: "payment_due" }),
      },
    });

    expect(event.name).toBe("reminder_clicked");

    const found = await prisma.productEvent.findMany({ where: { userId: user.id } });
    expect(found).toHaveLength(1);
    expect(JSON.parse(found[0].metadata as string)).toEqual({ type: "payment_due" });
  });

  it("persists and reads back UserSettings.onboardingDismissedAt", async () => {
    const { getPrismaClient } = await import("@/lib/services/database/database");
    const prisma = getPrismaClient();

    const user = await prisma.user.create({
      data: { email: `settings-test-${Date.now()}@example.com` },
    });

    const dismissedAt = new Date("2026-07-09T00:00:00.000Z");
    await prisma.userSettings.create({
      data: { userId: user.id, onboardingDismissedAt: dismissedAt },
    });

    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    expect(settings?.onboardingDismissedAt).toEqual(dismissedAt);
  });
});
