import { describe, expect, it } from "vitest";

import { computeFingerprint, hashIban } from "./import";

describe("hashIban", () => {
  it("is deterministic and normalizes spacing/case", () => {
    const a = hashIban("PT50000201231234567890154");
    const b = hashIban("pt50 0002 0123 1234 5678 9015 4");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different IBANs", () => {
    expect(hashIban("PT50000201231234567890154")).not.toBe(hashIban("ES9121000418450200051332"));
  });
});

describe("computeFingerprint", () => {
  const base = {
    bankAccountId: "acc_1",
    amount: 850,
    bookingDate: "2026-07-01",
    counterpartyIbanHash: "abc",
    counterpartyName: "Maria Silva",
    reference: "renda 07/2026",
  };

  it("is stable for identical rows (idempotent import)", () => {
    expect(computeFingerprint(base)).toBe(computeFingerprint({ ...base }));
  });

  it("changes when any identity component changes", () => {
    const fp = computeFingerprint(base);
    expect(computeFingerprint({ ...base, amount: 850.01 })).not.toBe(fp);
    expect(computeFingerprint({ ...base, bookingDate: "2026-07-02" })).not.toBe(fp);
    expect(computeFingerprint({ ...base, counterpartyIbanHash: "xyz" })).not.toBe(fp);
    expect(computeFingerprint({ ...base, reference: "renda 08/2026" })).not.toBe(fp);
    expect(computeFingerprint({ ...base, bankAccountId: "acc_2" })).not.toBe(fp);
  });

  it("falls back to normalized counterparty name when IBAN hash is missing", () => {
    const noIban = { ...base, counterpartyIbanHash: null };
    expect(computeFingerprint(noIban)).toBe(
      computeFingerprint({ ...noIban, counterpartyName: "MARIA  SILVA" }),
    );
    expect(computeFingerprint(noIban)).not.toBe(
      computeFingerprint({ ...noIban, counterpartyName: "Joao Santos" }),
    );
  });
});
