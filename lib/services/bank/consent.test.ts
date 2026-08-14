import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, providerMock, configuredMock } = vi.hoisted(() => ({
  prismaMock: {
    bankConnection: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    bankAccount: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
  providerMock: { key: "gocardless", createConsentLink: vi.fn(), completeConsent: vi.fn() },
  configuredMock: vi.fn(),
}));

vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/services/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/utils/pii-encryption", () => ({ encryptPII: (v: string) => `enc:${v}` }));
vi.mock("./import", () => ({ hashIban: (v: string) => `hash:${v.replace(/\s/g, "")}` }));
vi.mock("./providers/registry", () => ({
  configuredProviders: configuredMock,
  getBankProvider: () => providerMock,
  getProviderForConnection: (column: string) =>
    column.startsWith("psd2_") ? providerMock : undefined,
  providerColumnValue: (key: string) => `psd2_${key}`,
}));

import { startConsent, completeConsent, ConsentFlowError } from "./consent";

const REFERENCE = "a".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_URL = "https://situs.example.com";
  configuredMock.mockReturnValue(["gocardless"]);
  prismaMock.bankConnection.create.mockResolvedValue({ id: "conn-1" });
  prismaMock.bankConnection.update.mockResolvedValue({});
  prismaMock.bankConnection.findUnique.mockResolvedValue({ metadata: null });
  prismaMock.bankAccount.findFirst.mockResolvedValue(null);
  prismaMock.bankAccount.create.mockResolvedValue({ id: "acct-1" });
  providerMock.createConsentLink.mockResolvedValue({
    providerRef: "req-1",
    url: "https://bank.example/authorise",
    expiresAt: new Date("2026-11-12T00:00:00.000Z"),
  });
  providerMock.completeConsent.mockResolvedValue([]);
});

describe("starting a consent", () => {
  it("creates the pending row before leaving for the bank", async () => {
    // The reference must have something to come back to; if the provider call then fails, an
    // unfinished attempt is visible rather than silently lost.
    await startConsent("user-1", {
      country: "PT",
      institutionId: "BANCOBPI_BBPIPTPL",
      institutionName: "Banco BPI",
    });

    const created = prismaMock.bankConnection.create.mock.calls[0][0].data;
    expect(created).toMatchObject({
      userId: "user-1",
      provider: "psd2_gocardless",
      status: "pending_consent",
    });
    expect(prismaMock.bankConnection.create.mock.invocationCallOrder[0]).toBeLessThan(
      providerMock.createConsentLink.mock.invocationCallOrder[0],
    );
  });

  it("mints an unguessable reference", async () => {
    await startConsent("user-1", {
      country: "PT",
      institutionId: "X",
      institutionName: "Bank",
    });

    const { reference } = JSON.parse(
      prismaMock.bankConnection.create.mock.calls[0][0].data.metadata,
    );
    // 32 bytes hex. A short or sequential reference would make the callback forgeable.
    expect(reference).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses when no provider is configured on this instance", async () => {
    configuredMock.mockReturnValue([]);

    await expect(
      startConsent("user-1", { country: "PT", institutionId: "X", institutionName: "Bank" }),
    ).rejects.toBeInstanceOf(ConsentFlowError);
    expect(prismaMock.bankConnection.create).not.toHaveBeenCalled();
  });

  it("refuses without a base URL to bring the user back to", async () => {
    delete process.env.NEXTAUTH_URL;

    await expect(
      startConsent("user-1", { country: "PT", institutionId: "X", institutionName: "Bank" }),
    ).rejects.toThrow(/NEXTAUTH_URL/);
  });
});

/**
 * The callback is a plain GET the bank redirects the user's browser to. Anyone can navigate to it
 * with any query string, so all three guards below are load-bearing.
 */
describe("completing a consent", () => {
  function pending(overrides: Record<string, unknown> = {}) {
    return {
      id: "conn-1",
      userId: "user-1",
      provider: "psd2_gocardless",
      institutionName: "Banco BPI",
      status: "pending_consent",
      consentId: "req-1",
      metadata: JSON.stringify({ reference: REFERENCE }),
      ...overrides,
    };
  }

  it("activates the connection when the reference matches", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([pending()]);

    await expect(completeConsent("user-1", REFERENCE)).resolves.toBe("conn-1");
    expect(prismaMock.bankConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "active" } }),
    );
  });

  it("only ever looks at the caller's own pending connections", async () => {
    // Asserted on the query: a reference lifted from someone else's redirect must not resolve,
    // and comparing ownership after an unscoped fetch would still be an IDOR.
    prismaMock.bankConnection.findMany.mockResolvedValue([]);

    await expect(completeConsent("user-2", REFERENCE)).rejects.toBeInstanceOf(ConsentFlowError);
    expect(prismaMock.bankConnection.findMany.mock.calls[0][0].where).toEqual({
      userId: "user-2",
      status: "pending_consent",
    });
  });

  it("rejects a reference that does not match the stored one", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([pending()]);

    await expect(completeConsent("user-1", "b".repeat(64))).rejects.toBeInstanceOf(
      ConsentFlowError,
    );
    expect(providerMock.completeConsent).not.toHaveBeenCalled();
  });

  it("cannot be replayed, because only pending rows are queried", async () => {
    // The status filter is the single-use guard: an activated connection is not in the candidate
    // set at all, so a second visit to the same callback URL finds nothing.
    prismaMock.bankConnection.findMany.mockResolvedValue([]);

    await expect(completeConsent("user-1", REFERENCE)).rejects.toThrow(/no longer valid/i);
  });

  it("gives the same answer for unknown, replayed and foreign references", async () => {
    // Distinguishing them would confirm a valid reference to whoever guessed it.
    prismaMock.bankConnection.findMany.mockResolvedValue([]);
    const unknown = await completeConsent("user-1", REFERENCE).catch((e) => e.message);

    prismaMock.bankConnection.findMany.mockResolvedValue([pending()]);
    const wrong = await completeConsent("user-1", "c".repeat(64)).catch((e) => e.message);

    expect(unknown).toBe(wrong);
  });

  it("rejects a reference with no consent behind it", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([pending({ consentId: null })]);

    await expect(completeConsent("user-1", REFERENCE)).rejects.toThrow(/never reached the bank/i);
  });

  it("encrypts the IBAN and keeps only a hash for matching", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([pending()]);
    providerMock.completeConsent.mockResolvedValue([
      { id: "gc-1", iban: "PT50000201231234567890154", label: "Conta ordenado" },
    ]);

    await completeConsent("user-1", REFERENCE);

    const created = prismaMock.bankAccount.create.mock.calls[0][0].data;
    expect(created.iban).toBe("enc:PT50000201231234567890154");
    expect(created.ibanHash).toBe("hash:PT50000201231234567890154");
    expect(created.ibanLast4).toBe("0154");
  });

  it("updates an existing account rather than splitting its history on reconnect", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([pending()]);
    prismaMock.bankAccount.findFirst.mockResolvedValue({ id: "acct-existing" });
    prismaMock.bankAccount.update.mockResolvedValue({ id: "acct-existing" });
    providerMock.completeConsent.mockResolvedValue([
      { id: "gc-1", iban: "PT50000201231234567890154", label: "Conta ordenado" },
    ]);

    await completeConsent("user-1", REFERENCE);

    expect(prismaMock.bankAccount.create).not.toHaveBeenCalled();
    expect(prismaMock.bankAccount.update).toHaveBeenCalled();
  });

  it("drops the spent reference and records the provider account ids", async () => {
    prismaMock.bankConnection.findMany.mockResolvedValue([pending()]);
    // The row still carries the reference when persistAccounts re-reads it — which is exactly
    // the case that would let a careless metadata merge carry the spent token forward.
    prismaMock.bankConnection.findUnique.mockResolvedValue({
      metadata: JSON.stringify({ reference: REFERENCE }),
    });
    providerMock.completeConsent.mockResolvedValue([{ id: "gc-1", label: "Conta" }]);

    await completeConsent("user-1", REFERENCE);

    const metadataWrite = prismaMock.bankConnection.update.mock.calls.find(
      (call) => typeof call[0].data.metadata === "string",
    )!;
    const metadata = JSON.parse(metadataWrite[0].data.metadata);
    // Keeping a spent reference would leave a usable token on a row that is no longer pending.
    expect(metadata.reference).toBeUndefined();
    expect(metadata.accountRefs).toEqual({ "acct-1": "gc-1" });
  });
});
