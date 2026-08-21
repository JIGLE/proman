import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * This page is opened when something is wrong, so one failing measurement must not blank the other
 * five. Same rule as `getSystemStatus`, and the same reason: diagnostics that fail alongside the
 * thing they diagnose are not diagnostics.
 *
 * The other property under test is the distinction between zero and unknown. An empty document
 * store and an unreadable one are different facts, and rendering both as "0 B" turns a measurement
 * failure into a confident claim.
 */

const { prismaMock, coreLoopMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { count: vi.fn() },
    document: { count: vi.fn(), aggregate: vi.fn() },
    auditLog: { count: vi.fn() },
  },
  coreLoopMock: vi.fn(),
}));

vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/services/analytics/activation-summary", () => ({
  getCoreLoopMetrics: coreLoopMock,
}));

import { databaseFileSize, getInstanceMetrics } from "./instance-metrics";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(1);
  prismaMock.document.count.mockResolvedValue(4);
  prismaMock.document.aggregate.mockResolvedValue({ _sum: { fileSize: 2048 } });
  prismaMock.auditLog.count.mockResolvedValue(120);
  coreLoopMock.mockResolvedValue({ receiptsPaidLast30Days: 3 });
});

describe("measuring the database file", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "situs-metrics-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports the size of a file: url", () => {
    const file = path.join(dir, "situs.sqlite");
    writeFileSync(file, "x".repeat(500));
    expect(databaseFileSize(`file:${file}`)).toBe(500);
  });

  it("returns unknown rather than zero for a path that does not exist", () => {
    // Zero would render as "0 B", which reads as a measured empty database rather than a failed
    // measurement.
    expect(databaseFileSize(`file:${path.join(dir, "missing.sqlite")}`)).toBeNull();
  });

  it("returns unknown for a non-file DATABASE_URL", () => {
    // A managed database has no local file. Guessing a size for one would be inventing a number.
    expect(databaseFileSize("postgresql://host/db")).toBeNull();
    expect(databaseFileSize(undefined)).toBeNull();
  });
});

describe("gathering instance metrics", () => {
  it("reports every family when all probes succeed", async () => {
    const metrics = await getInstanceMetrics();
    expect(metrics.accounts.total).toBe(1);
    expect(metrics.documents).toEqual({ count: 4, bytes: 2048 });
    expect(metrics.auditLogEntries).toBe(120);
    expect(metrics.activation).toEqual({ receiptsPaidLast30Days: 3 });
  });

  it("keeps the other numbers when one probe throws", async () => {
    // The assertion this file exists for. `Promise.all` here would lose all six to one failure.
    prismaMock.auditLog.count.mockRejectedValue(new Error("no such table: AuditLog"));

    const metrics = await getInstanceMetrics();
    expect(metrics.auditLogEntries).toBe(0);
    expect(metrics.accounts.total).toBe(1);
    expect(metrics.documents.count).toBe(4);
  });

  it("reports document storage as unknown when the aggregate fails", async () => {
    prismaMock.document.aggregate.mockRejectedValue(new Error("boom"));

    const metrics = await getInstanceMetrics();
    expect(metrics.documents.bytes).toBeNull();
    // The count came from a different query and is still good — one failure, one unknown.
    expect(metrics.documents.count).toBe(4);
  });

  it("reports zero bytes as zero, not unknown, when there are no documents", async () => {
    // The other side of the same distinction: an empty store IS a measurement.
    prismaMock.document.count.mockResolvedValue(0);
    prismaMock.document.aggregate.mockResolvedValue({ _sum: { fileSize: null } });

    const metrics = await getInstanceMetrics();
    expect(metrics.documents.bytes).toBe(0);
  });

  it("survives the activation funnel failing", async () => {
    coreLoopMock.mockRejectedValue(new Error("groupBy unsupported"));

    const metrics = await getInstanceMetrics();
    expect(metrics.activation).toBeNull();
    expect(metrics.accounts.total).toBe(1);
  });
});
