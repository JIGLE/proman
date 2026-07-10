import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * End-to-end proof that lib/services/database/database.ts actually writes
 * ciphertext to disk for PII_FIELDS — not just that the transform functions
 * are correct in isolation (see pii-extension.test.ts), but that the real
 * Prisma extension wired into the shared getPrismaClient() singleton
 * behaves correctly against a real SQLite file.
 *
 * The "what's actually on disk" check reads the SQLite file's raw bytes
 * directly (no second DB driver/connection — those proved unreliable in
 * this Prisma version/sandbox) and searches for the plaintext value /
 * ciphertext marker as byte sequences. SQLite stores short TEXT values as
 * literal UTF-8 bytes in its b-tree pages, so this is a legitimate,
 * dependency-free way to prove the plaintext isn't stored unencrypted.
 */
describe("PII encryption — real Prisma client + real SQLite file", () => {
  const TEST_KEY = "b".repeat(64);
  let tempDir: string;
  let dbPath: string;
  let dbUrl: string;

  beforeAll(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "proman-pii-test-"));
    dbPath = path.join(tempDir, "test.db");
    dbUrl = `file:${dbPath}`;

    execSync(`npx prisma db push --accept-data-loss --url="${dbUrl}"`, {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
    });

    process.env.DATABASE_URL = dbUrl;
    process.env.PII_ENCRYPTION_KEY = TEST_KEY;
  }, 60_000);

  afterAll(async () => {
    const { resetPrismaClientForTests } = await import("./database");
    resetPrismaClientForTests();
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("encrypts Owner PII at rest and decrypts transparently on read", async () => {
    // tests/setup.ts injects an in-memory mock client whenever DATABASE_URL
    // is unset at setup time (it is, in this repo's default dev/test env —
    // see .env.example). Clear that cached mock now that DATABASE_URL and
    // PII_ENCRYPTION_KEY are set, so getPrismaClient() constructs a real
    // client (with the real extension) against our temp SQLite file.
    const { getPrismaClient, resetPrismaClientForTests } = await import("./database");
    resetPrismaClientForTests();
    const prisma = getPrismaClient();

    const user = await prisma.user.create({
      data: { email: `pii-test-${Date.now()}@example.com` },
    });

    const plainPhone = "+351 912 345 678";
    const plainNif = "123456789";

    const owner = await prisma.owner.create({
      data: {
        userId: user.id,
        name: "Carlos Santos",
        email: `owner-${Date.now()}@example.com`,
        phone: plainPhone,
        taxIdentificationNumber: plainNif,
      },
    });

    // 1. The Prisma client (extension applied) hands back plaintext.
    expect(owner.phone).toBe(plainPhone);
    expect(owner.taxIdentificationNumber).toBe(plainNif);

    const reread = await prisma.owner.findUnique({ where: { id: owner.id } });
    expect(reread?.phone).toBe(plainPhone);
    expect(reread?.taxIdentificationNumber).toBe(plainNif);

    // SQLite (WAL journal mode, Prisma's default) keeps recent writes in a
    // separate -wal file until a checkpoint moves them into the main file.
    // Disconnect first, then search every file SQLite may have written to.
    await prisma.$disconnect();

    // 2. What's actually on disk — read the raw file BYTES directly (main
    // db file + WAL/journal siblings) and byte-search for each needle.
    // Deliberately NOT decoded as a string first: SQLite pages are mostly
    // binary (varints, length prefixes) interleaved with UTF-8 text, and
    // decoding the whole buffer as utf8 can corrupt a valid ASCII substring
    // when a preceding binary byte happens to look like a multi-byte
    // sequence lead byte. Buffer#includes searches raw bytes, avoiding that.
    const candidates = [dbPath, `${dbPath}-wal`, `${dbPath}-journal`].filter(existsSync);
    expect(candidates.length).toBeGreaterThan(0);

    const raw = Buffer.concat(candidates.map((p) => readFileSync(p)));

    expect(raw.includes(plainPhone, 0, "utf8")).toBe(false);
    expect(raw.includes(plainNif, 0, "utf8")).toBe(false);
    expect(raw.includes("enc:", 0, "utf8")).toBe(true);
  });
});
