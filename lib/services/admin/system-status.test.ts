import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The two properties this page must never lose.
 *
 * 1. It never presents a simulated connection as working. The connector UI once rendered `live`
 *    in green — the colour of "working" — on the one mode that refuses to act. A status page
 *    that repeats that mistake is worse than no status page, because an operator opens it
 *    specifically to find out what is real.
 *
 * 2. It degrades instead of throwing. Every check is independent, so one failing probe must not
 *    empty the page. A diagnostics payload that 500s is useless at the only moment it matters.
 */

const { prismaMock, driftMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    taxAuthorityConnector: { findMany: vi.fn() },
    bankConnection: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  driftMock: vi.fn(),
}));

vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("./schema-drift", () => ({ checkSchemaDrift: driftMock }));

import { getSystemStatus, type StatusCheck, type StatusSeverity } from "./system-status";

const find = (checks: StatusCheck[], id: string) => checks.find((c) => c.id === id);

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  prismaMock.taxAuthorityConnector.findMany.mockResolvedValue([]);
  prismaMock.bankConnection.findMany.mockResolvedValue([]);
  prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
  driftMock.mockResolvedValue({
    inSync: true,
    missingTables: [],
    missingColumns: [],
    tablesChecked: 30,
  });
  process.env.PII_ENCRYPTION_KEY = "x".repeat(64);
  delete process.env.ALLOW_UNENCRYPTED_PII;
  delete process.env.SENDGRID_API_KEY;
  delete process.env.STRIPE_SECRET_KEY;
});

describe("nothing simulated is ever reported as ok", () => {
  it("marks a sandbox tax connector simulated, not ok", async () => {
    prismaMock.taxAuthorityConnector.findMany.mockResolvedValue([
      { country: "PT", mode: "sandbox", status: "active", lastSubmissionAt: null },
    ]);

    const { checks } = await getSystemStatus("user-1");
    const pt = find(checks, "tax:PT")!;

    expect(pt.severity).toBe("simulated");
    expect(pt.severity).not.toBe("ok");
    // The word has to be in the TEXT, not only in the styling — colour alone is not a claim a
    // screen reader or a colourblind operator can read.
    expect(pt.detail).toMatch(/simulated|nothing is transmitted/i);
  });

  it("marks the bank simulated when no bank is connected", async () => {
    const { checks } = await getSystemStatus("user-1");
    const bank = find(checks, "bank")!;

    expect(bank.severity).toBe("simulated");
    expect(bank.detail).toMatch(/no bank is connected/i);
  });

  it("escalates an unsupported connector mode to error, because the symptom is silence", async () => {
    prismaMock.taxAuthorityConnector.findMany.mockResolvedValue([
      { country: "PT", mode: "live", status: "active", lastSubmissionAt: null },
    ]);

    const { checks } = await getSystemStatus("user-1");
    const pt = find(checks, "tax:PT")!;

    // "live" is the mode the guard refuses. Nothing submits and nothing warns, so this is the
    // one connector state that has to shout.
    expect(pt.severity).toBe("error");
    expect(pt.remedy).toMatch(/sandbox|review/i);
  });

  it("reports a country with no connector row without inventing a status", async () => {
    const { checks } = await getSystemStatus("user-1");

    // ES has a registered connector but no record for this user yet.
    expect(find(checks, "tax:ES")!.severity).toBe("simulated");
    expect(find(checks, "tax:ES")!.state).toBe("not_created");
  });
});

describe("schema drift is surfaced as the error it is", () => {
  it("reports drift with the missing column and the command that fixes it", async () => {
    driftMock.mockResolvedValue({
      inSync: false,
      missingTables: [],
      missingColumns: ["tenants.portalAccessRevokedAt"],
      tablesChecked: 30,
    });

    const { checks } = await getSystemStatus("user-1");
    const schema = find(checks, "schema")!;

    expect(schema.severity).toBe("error");
    expect(schema.detail).toContain("tenants.portalAccessRevokedAt");
    expect(schema.remedy).toContain("prisma db push");
  });

  it("does not claim in_sync when the check itself failed", async () => {
    // The trap this guards: a checker that cannot run returning a clean bill of health.
    driftMock.mockResolvedValue({
      inSync: false,
      missingTables: [],
      missingColumns: [],
      tablesChecked: 0,
      error: "No models parsed from prisma/schema.prisma",
    });

    const { checks } = await getSystemStatus("user-1");
    const schema = find(checks, "schema")!;

    expect(schema.severity).toBe("warning");
    expect(schema.state).toBe("unknown");
    expect(schema.state).not.toBe("in_sync");
  });
});

describe("configuration checks", () => {
  it("flags a missing PII key, and escalates when it has been waived", async () => {
    delete process.env.PII_ENCRYPTION_KEY;
    expect(find((await getSystemStatus("u")).checks, "pii")!.severity).toBe("warning");

    process.env.ALLOW_UNENCRYPTED_PII = "true";
    const waived = find((await getSystemStatus("u")).checks, "pii")!;
    // Waived is worse than absent: the app starts and silently stores plaintext IBANs and NIFs.
    expect(waived.severity).toBe("error");
    expect(waived.detail).toMatch(/plaintext/i);
  });

  it("treats absent Stripe as ok, because self-hosted is unlimited by design", async () => {
    const billing = find((await getSystemStatus("u")).checks, "billing")!;
    expect(billing.severity).toBe("ok");
    expect(billing.state).toBe("disabled");
  });

  it("warns when Stripe is half-configured", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const billing = find((await getSystemStatus("u")).checks, "billing")!;
    expect(billing.severity).toBe("warning");
    expect(billing.detail).toMatch(/STRIPE_PRICE_ID_PRO/);
  });
});

describe("the page survives its own probes failing", () => {
  it("still returns the other checks when the database is unreachable", async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error("SQLITE_CANTOPEN: unable to open file"));
    prismaMock.taxAuthorityConnector.findMany.mockRejectedValue(new Error("no such table"));
    prismaMock.bankConnection.findMany.mockRejectedValue(new Error("no such table"));

    const status = await getSystemStatus("user-1");

    expect(status.checks.length).toBeGreaterThan(3);
    expect(find(status.checks, "database")!.severity).toBe("error");
    // The env-based checks do not touch the database and must survive.
    expect(find(status.checks, "pii")).toBeTruthy();
    expect(find(status.checks, "email")).toBeTruthy();
  });

  it("never puts raw exception text in the payload", async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error("SQLITE_CANTOPEN: /srv/data/situs.sqlite"));

    const status = await getSystemStatus("user-1");
    const serialised = JSON.stringify(status);

    // This payload reaches a browser. A driver error names file paths and table names.
    expect(serialised).not.toContain("SQLITE_CANTOPEN");
    expect(serialised).not.toContain("/srv/data");
  });

  it("orders the worst news first and counts each severity", async () => {
    driftMock.mockResolvedValue({
      inSync: false,
      missingTables: ["tenants"],
      missingColumns: [],
      tablesChecked: 30,
    });

    const status = await getSystemStatus("user-1");

    // An operator scanning the page should not have to hunt for the broken row.
    expect(status.checks[0].severity).toBe("error");
    const total = (Object.keys(status.counts) as StatusSeverity[]).reduce(
      (sum, key) => sum + status.counts[key],
      0,
    );
    expect(total).toBe(status.checks.length);
  });
});

/**
 * A session can outlive the user row it names — sign in while the database is unreachable and
 * the JWT ends up carrying the OAuth provider's id. The app looks fine; every write fails with
 * a foreign-key error that names a constraint, not a cause.
 */
describe("the signed-in account resolves to a real user row", () => {
  it("is ok when the session id matches a user", async () => {
    const { checks } = await getSystemStatus("user-1");
    expect(find(checks, "session_user")!.severity).toBe("ok");
  });

  it("is an error, with a remedy, when the session id matches nothing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const { checks } = await getSystemStatus("google-sub-999");
    const check = find(checks, "session_user")!;
    expect(check.severity).toBe("error");
    expect(check.state).toBe("orphaned");
    expect(check.remedy).toMatch(/[Ss]ign out/);
  });

  it("degrades to a warning rather than throwing when the lookup fails", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("connection refused"));

    const { checks } = await getSystemStatus("user-1");
    expect(find(checks, "session_user")!.severity).toBe("warning");
    // The other probes still reported.
    expect(find(checks, "schema")).toBeDefined();
  });
});

/**
 * This check used to hardcode `simulated` and the sentence "no live bank connection exists".
 * That was true when it was written and became false the moment a bank could be connected — the
 * exact failure the file's first rule exists to prevent. It has to read the state, not assert it.
 */
describe("the bank check reports what is actually connected", () => {
  it("is simulated when only manual/CSV connections exist", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([
      { provider: "manual", status: "active", lastSyncAt: null, institutionName: "Manual import" },
    ]);

    const { checks } = await getSystemStatus("user-1");
    const bank = find(checks, "bank")!;
    expect(bank.severity).toBe("simulated");
    expect(bank.detail).not.toMatch(/no live bank connection exists/i);
  });

  it("is ok, and names the bank, once a provider connection is active", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([
      { provider: "manual", status: "active", lastSyncAt: null, institutionName: "Manual import" },
      {
        provider: "psd2_gocardless",
        status: "active",
        lastSyncAt: new Date("2026-08-14T08:00:00Z"),
        institutionName: "Banco BPI",
      },
    ]);

    const { checks } = await getSystemStatus("user-1");
    const bank = find(checks, "bank")!;
    expect(bank.severity).toBe("ok");
    expect(bank.detail).toMatch(/Banco BPI/);
  });

  it("is an error with a remedy when a consent has lapsed", async () => {
    // Nothing arrives in this state, so it must not sit quietly as ok or simulated.
    prismaMock.bankConnection.findMany.mockResolvedValue([
      {
        provider: "psd2_gocardless",
        status: "expired",
        lastSyncAt: new Date("2026-08-01T08:00:00Z"),
        institutionName: "Banco BPI",
      },
    ]);

    const { checks } = await getSystemStatus("user-1");
    const bank = find(checks, "bank")!;
    expect(bank.severity).toBe("error");
    expect(bank.remedy).toMatch(/reconnect/i);
  });

  it("prefers the expired warning when one connection works and another does not", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([
      {
        provider: "psd2_gocardless",
        status: "active",
        lastSyncAt: null,
        institutionName: "Banco BPI",
      },
      {
        provider: "psd2_gocardless",
        status: "expired",
        lastSyncAt: null,
        institutionName: "Santander",
      },
    ]);

    const { checks } = await getSystemStatus("user-1");
    expect(find(checks, "bank")!.severity).toBe("error");
  });
});
