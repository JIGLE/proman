import { describe, expect, it } from "vitest";

import {
  AUTO_MATCH_THRESHOLD,
  classifyMatch,
  findPossibleDuplicate,
  parseReferenceMonth,
  scoreCandidate,
  type LeaseCandidate,
  type TransactionInput,
} from "./engine";

const RENT = 950;

const lease: LeaseCandidate = {
  leaseId: "lease-1",
  tenantName: "João Silva",
  monthlyRent: RENT,
  knownIbanHashes: ["hash-joao"],
  propertyTokens: ["Rua Augusta"],
};

function txn(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    id: "txn-1",
    amount: RENT,
    bookingDate: new Date("2026-06-01"),
    counterpartyIbanHash: "hash-joao",
    counterpartyName: "Joao Silva",
    reference: "Renda Junho Rua Augusta",
    ...overrides,
  };
}

describe("scoreCandidate", () => {
  it("full signal stack (IBAN + name + amount + reference) reaches auto-match confidence", () => {
    const score = scoreCandidate(txn(), lease);
    expect(score.reasons).toEqual(
      expect.arrayContaining(["iban_match", "name_match", "amount_exact", "reference_hit"]),
    );
    expect(score.confidence).toBeGreaterThanOrEqual(AUTO_MATCH_THRESHOLD);
  });

  it("name matching tolerates diacritics and order", () => {
    const score = scoreCandidate(
      txn({ counterpartyIbanHash: null, counterpartyName: "SILVA Joao" }),
      lease,
    );
    expect(score.reasons).toContain("name_match");
  });

  it("amount within ±1% counts as exact; a known remainder scores half", () => {
    expect(scoreCandidate(txn({ amount: RENT * 1.005 }), lease).reasons).toContain("amount_exact");
    const partial = scoreCandidate(txn({ amount: 550 }), { ...lease, knownRemainder: 550 });
    expect(partial.reasons).toContain("amount_remainder");
  });

  it("unknown payer: no signals fire → confidence below suggestion threshold", () => {
    const score = scoreCandidate(
      txn({
        counterpartyIbanHash: "hash-stranger",
        counterpartyName: "Unrelated Corp Lda",
        amount: 123.45,
        reference: "invoice 998877",
      }),
      lease,
    );
    expect(score.reasons).toEqual([]);
    expect(score.confidence).toBe(0);
  });
});

describe("classifyMatch", () => {
  const leaseB: LeaseCandidate = {
    leaseId: "lease-2",
    tenantName: "João Silva",
    monthlyRent: 1200,
    knownIbanHashes: ["hash-joao"],
    propertyTokens: ["Villa Cascais"],
  };

  it("multi-property tenant: amount disambiguates the lease", () => {
    const result = classifyMatch(txn({ amount: 1200, reference: "renda" }), [lease, leaseB]);
    expect(result.best?.leaseId).toBe("lease-2");
    expect(result.status).toBe("auto_matched");
  });

  it("equal-rent ambiguity guard: top-two too close → needs_review, never auto", () => {
    const equalRent = { ...leaseB, monthlyRent: RENT, propertyTokens: ["Rua Augusta"] };
    const result = classifyMatch(txn(), [lease, equalRent]);
    expect(result.ambiguous).toBe(true);
    expect(result.status).toBe("needs_review");
  });

  it("weak evidence stays in review even as best candidate", () => {
    const result = classifyMatch(
      txn({ counterpartyIbanHash: null, counterpartyName: null, reference: null }),
      [lease],
    );
    expect(result.best?.leaseId).toBe("lease-1");
    expect(result.status).toBe("needs_review");
  });
});

describe("findPossibleDuplicate", () => {
  const prior = txn({ id: "txn-0", bookingDate: new Date("2026-05-31") });

  it("same counterparty + amount within 3 days → flags the prior transaction", () => {
    expect(findPossibleDuplicate(txn(), [prior])).toBe("txn-0");
  });

  it("outside the window or different amount → no flag", () => {
    expect(findPossibleDuplicate(txn({ bookingDate: new Date("2026-06-10") }), [prior])).toBeNull();
    expect(findPossibleDuplicate(txn({ amount: RENT + 50 }), [prior])).toBeNull();
  });

  it("matches on normalized name when IBAN is missing", () => {
    const noIban = txn({ counterpartyIbanHash: null, counterpartyName: "JOÃO  SILVA" });
    const priorNoIban = txn({
      id: "txn-0",
      counterpartyIbanHash: null,
      counterpartyName: "joao silva",
      bookingDate: new Date("2026-05-31"),
    });
    expect(findPossibleDuplicate(noIban, [priorNoIban])).toBe("txn-0");
  });
});

describe("parseReferenceMonth", () => {
  it("parses MM/YYYY and YYYY-MM forms", () => {
    expect(parseReferenceMonth("renda 07/2026")).toEqual({ year: 2026, month: 7 });
    expect(parseReferenceMonth("2026-07 rua augusta")).toEqual({ year: 2026, month: 7 });
  });

  it("returns null when no month token exists (wrong-reference guard input)", () => {
    expect(parseReferenceMonth("transferencia familiar")).toBeNull();
  });
});
