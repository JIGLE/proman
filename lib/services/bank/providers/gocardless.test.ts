import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  mapTransaction,
  goCardlessProvider,
  isGoCardlessConfigured,
  resetTokenCache,
  type GoCardlessTransaction,
} from "./gocardless";
import { ConsentExpiredError } from "./types";

/**
 * Most of the risk in this integration lives in `mapTransaction`. Everything downstream — dedupe,
 * reconciliation rules, confidence scoring, the 0.85 auto-allocation threshold — trusts the row it
 * produces, so a sign error or a swapped counterparty does not throw. It silently allocates a
 * tenant's rent to the wrong lease, and the first sign of it is a receipt that should not exist.
 */
describe("mapTransaction", () => {
  const base: GoCardlessTransaction = {
    bookingDate: "2026-08-01",
    transactionAmount: { amount: "750.00", currency: "EUR" },
  };

  it("reads the debtor as counterparty on money in", () => {
    // Rent arriving: the tenant is the one the money came FROM.
    const row = mapTransaction({
      ...base,
      debtorName: "Ana Silva",
      debtorAccount: { iban: "PT50000201231234567890154" },
      creditorName: "Landlord Lda",
      creditorAccount: { iban: "PT50000201230000000000000" },
    })!;

    expect(row.counterpartyName).toBe("Ana Silva");
    expect(row.counterpartyIban).toBe("PT50000201231234567890154");
  });

  it("reads the creditor as counterparty on money out", () => {
    const row = mapTransaction({
      ...base,
      transactionAmount: { amount: "-120.00", currency: "EUR" },
      debtorName: "Landlord Lda",
      creditorName: "EDP Comercial",
      creditorAccount: { iban: "PT50000201239999999999999" },
    })!;

    expect(row.counterpartyName).toBe("EDP Comercial");
    expect(row.counterpartyIban).toBe("PT50000201239999999999999");
  });

  it("falls back to the other side when the bank populates only one", () => {
    // PT and ES banks routinely fill exactly one party. Dropping the name would cost the match.
    const incoming = mapTransaction({ ...base, creditorName: "Ana Silva" })!;
    expect(incoming.counterpartyName).toBe("Ana Silva");

    const outgoing = mapTransaction({
      ...base,
      transactionAmount: { amount: "-50.00" },
      debtorName: "EDP Comercial",
    })!;
    expect(outgoing.counterpartyName).toBe("EDP Comercial");
  });

  it("preserves the sign of the amount", () => {
    expect(mapTransaction(base)!.amount).toBe(750);
    expect(mapTransaction({ ...base, transactionAmount: { amount: "-750.00" } })!.amount).toBe(
      -750,
    );
  });

  it("accepts the array remittance form as well as the scalar", () => {
    expect(
      mapTransaction({ ...base, remittanceInformationUnstructured: "RENDA AGOSTO" })!.reference,
    ).toBe("RENDA AGOSTO");

    expect(
      mapTransaction({
        ...base,
        remittanceInformationUnstructuredArray: ["RENDA", "AGOSTO", "T2"],
      })!.reference,
    ).toBe("RENDA AGOSTO T2");
  });

  it("uses additionalInformation only as a last resort", () => {
    expect(mapTransaction({ ...base, additionalInformation: "TRF" })!.reference).toBe("TRF");

    const both = mapTransaction({
      ...base,
      remittanceInformationUnstructured: "RENDA AGOSTO",
      additionalInformation: "TRF",
    })!;
    expect(both.reference).toBe("RENDA AGOSTO");
  });

  it("falls back to valueDate when the bank omits bookingDate", () => {
    const row = mapTransaction({
      transactionAmount: { amount: "750.00" },
      valueDate: "2026-08-03",
    })!;
    expect(row.bookingDate).toBe("2026-08-03");
  });

  it("drops rows with no amount or no date", () => {
    // A fingerprint built from undefined would collide with every other broken row, so these
    // must never reach the pipeline.
    expect(mapTransaction({ bookingDate: "2026-08-01" })).toBeNull();
    expect(mapTransaction({ transactionAmount: { amount: "750.00" } })).toBeNull();
    expect(
      mapTransaction({ bookingDate: "2026-08-01", transactionAmount: { amount: "not-a-number" } }),
    ).toBeNull();
  });

  it("leaves absent fields undefined rather than empty strings", () => {
    const row = mapTransaction(base)!;
    expect(row.counterpartyName).toBeUndefined();
    expect(row.counterpartyIban).toBeUndefined();
    expect(row.reference).toBeUndefined();
  });
});

describe("goCardlessProvider", () => {
  const fetchMock = vi.fn();

  /** Every call mints a token first, so each case seeds that response before its own. */
  function respond(...bodies: unknown[]) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access: "test-token", access_expires: 86400 }),
    });
    for (const body of bodies) {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });
    }
  }

  beforeEach(() => {
    resetTokenCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.GOCARDLESS_SECRET_ID = "test-id";
    process.env.GOCARDLESS_SECRET_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOCARDLESS_SECRET_ID;
    delete process.env.GOCARDLESS_SECRET_KEY;
    delete process.env.GOCARDLESS_API_BASE;
  });

  it("targets the real provider unless told otherwise", async () => {
    respond([]);
    await goCardlessProvider.listInstitutions("PT");
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url.startsWith("https://bankaccountdata.gocardless.com/api/v2")).toBe(true);
  });

  it("honours GOCARDLESS_API_BASE, which is how the E2E points at a fixture server", async () => {
    process.env.GOCARDLESS_API_BASE = "http://localhost:4599/api/v2";
    respond([]);
    await goCardlessProvider.listInstitutions("PT");
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url.startsWith("http://localhost:4599/api/v2")).toBe(true);
  });

  it("refuses a non-HTTPS override that is not loopback", async () => {
    // The credential pair is POSTed to whatever this names, so a typo'd http:// would put the
    // secret on the wire in plaintext.
    process.env.GOCARDLESS_API_BASE = "http://bankaccountdata.gocardless.com/api/v2";
    await expect(goCardlessProvider.listInstitutions("PT")).rejects.toThrow(/must be https/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an override that is not a URL at all", async () => {
    process.env.GOCARDLESS_API_BASE = "not-a-url";
    await expect(goCardlessProvider.listInstitutions("PT")).rejects.toThrow(/valid URL/i);
  });

  it("reports configured only when both secrets are present", () => {
    expect(isGoCardlessConfigured()).toBe(true);
    delete process.env.GOCARDLESS_SECRET_KEY;
    expect(isGoCardlessConfigured()).toBe(false);
  });

  it("mints one token and reuses it across calls", () => {
    // The token is good for 24h; re-minting on every request would burn the daily budget.
    respond([], []);
    return goCardlessProvider.listInstitutions("PT").then(async () => {
      await goCardlessProvider.listInstitutions("ES");
      const tokenCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/token/new/"));
      expect(tokenCalls).toHaveLength(1);
    });
  });

  it("maps institutions and their history window", async () => {
    respond([{ id: "BANCOBPI_BBPIPTPL", name: "Banco BPI", transaction_total_days: "730" }]);

    const [bank] = await goCardlessProvider.listInstitutions("pt");
    expect(bank).toMatchObject({
      id: "BANCOBPI_BBPIPTPL",
      name: "Banco BPI",
      country: "PT",
      maxHistoricalDays: 730,
    });
  });

  it("imports booked transactions only", async () => {
    // Pending entries change amount or vanish before settling; importing them would mint
    // fingerprints for movements that never happened.
    respond({
      transactions: {
        booked: [
          { bookingDate: "2026-08-01", transactionAmount: { amount: "750.00" }, debtorName: "Ana" },
        ],
        pending: [
          { bookingDate: "2026-08-02", transactionAmount: { amount: "999.00" }, debtorName: "X" },
        ],
      },
    });

    const rows = await goCardlessProvider.fetchTransactions("acc-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].counterpartyName).toBe("Ana");
  });

  it("drops unmappable rows instead of failing the whole sync", async () => {
    respond({
      transactions: {
        booked: [
          { bookingDate: "2026-08-01", transactionAmount: { amount: "750.00" } },
          { bookingDate: "2026-08-02" },
        ],
      },
    });

    expect(await goCardlessProvider.fetchTransactions("acc-1")).toHaveLength(1);
  });

  it("treats a revoked consent as ConsentExpiredError, not a generic failure", async () => {
    // The remedy differs: this one needs the user to re-authorise, and reporting it as
    // "0 new movements" would be an indefinite silent outage.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access: "test-token" }),
    });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });

    await expect(goCardlessProvider.fetchTransactions("acc-1")).rejects.toBeInstanceOf(
      ConsentExpiredError,
    );
  });

  it("treats a dead requisition status as an expired consent", async () => {
    respond({ status: "EX", accounts: [] });

    await expect(goCardlessProvider.completeConsent("req-1")).rejects.toBeInstanceOf(
      ConsentExpiredError,
    );
  });

  it("says so plainly when the provider's daily cap is hit", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access: "test-token" }),
    });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) });

    await expect(goCardlessProvider.fetchTransactions("acc-1")).rejects.toThrow(/rate limit/i);
  });

  it("keeps an account whose details call fails", async () => {
    // Details are separately rate-limited. Losing them must not lose the account itself —
    // transactions come from a different endpoint.
    respond({ status: "LN", accounts: ["acc-1"] });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) });

    const accounts = await goCardlessProvider.completeConsent("req-1");
    expect(accounts).toEqual([{ id: "acc-1", label: "Bank account" }]);
  });

  it("never echoes the credentials back when authentication fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });

    await expect(goCardlessProvider.listInstitutions("PT")).rejects.toThrow(
      /authentication failed \(HTTP 401\)/i,
    );
    await expect(goCardlessProvider.listInstitutions("PT")).rejects.not.toThrow(/test-key/);
  });
});
