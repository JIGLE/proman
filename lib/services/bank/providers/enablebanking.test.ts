import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

import {
  buildAuthJwt,
  decodeInstitutionId,
  encodeInstitutionId,
  isEnableBankingConfigured,
  mapTransaction,
  type EnableBankingTransaction,
} from "./enablebanking";

/** A throwaway keypair. Signing is verified against the public half, so the test proves the JWT
 * is genuinely signed rather than merely well-shaped. */
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const APP_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function configure(key: string = privateKey) {
  process.env.ENABLE_BANKING_APPLICATION_ID = APP_ID;
  process.env.ENABLE_BANKING_PRIVATE_KEY = key;
}

beforeEach(() => {
  delete process.env.ENABLE_BANKING_APPLICATION_ID;
  delete process.env.ENABLE_BANKING_PRIVATE_KEY;
  delete process.env.ENABLE_BANKING_API_BASE;
});

afterEach(() => {
  delete process.env.ENABLE_BANKING_APPLICATION_ID;
  delete process.env.ENABLE_BANKING_PRIVATE_KEY;
  delete process.env.ENABLE_BANKING_API_BASE;
});

describe("configuration", () => {
  it("is unconfigured until both the application id and the key are present", () => {
    expect(isEnableBankingConfigured()).toBe(false);

    process.env.ENABLE_BANKING_APPLICATION_ID = APP_ID;
    expect(isEnableBankingConfigured()).toBe(false);

    process.env.ENABLE_BANKING_PRIVATE_KEY = privateKey;
    expect(isEnableBankingConfigured()).toBe(true);
  });

  it("accepts the key base64-encoded, for env fields that mangle multi-line values", () => {
    // TrueNAS' app config is one such surface. Detected rather than configured — a PEM always
    // announces itself with its BEGIN line.
    configure(Buffer.from(privateKey).toString("base64"));
    expect(isEnableBankingConfigured()).toBe(true);
    expect(() => buildAuthJwt()).not.toThrow();
  });
});

describe("the authorization JWT", () => {
  it("is signed by the application's own key, and verifies against its public half", () => {
    configure();
    const [header, payload, signature] = buildAuthJwt().split(".");

    const ok = crypto
      .createVerify("RSA-SHA256")
      .update(`${header}.${payload}`)
      .verify(publicKey, Buffer.from(signature, "base64url"));

    expect(ok).toBe(true);
  });

  it("carries the exact claims the API expects", () => {
    // A wrong `aud` or a missing `kid` comes back as an opaque 401 from the far end, which is
    // undiagnosable from the outside. Pinning them here is the only place it is cheap to catch.
    configure();
    const now = new Date("2026-08-20T10:00:00.000Z");
    const [rawHeader, rawPayload] = buildAuthJwt(now).split(".");

    const header = JSON.parse(Buffer.from(rawHeader, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8"));

    expect(header).toEqual({ typ: "JWT", alg: "RS256", kid: APP_ID });
    expect(payload.iss).toBe("enablebanking.com");
    expect(payload.aud).toBe("api.enablebanking.com");
    expect(payload.iat).toBe(Math.floor(now.getTime() / 1000));
    expect(payload.exp).toBe(payload.iat + 3600);
  });

  it("refuses to sign when unconfigured rather than emitting an unsigned token", () => {
    expect(() => buildAuthJwt()).toThrow(/not configured/i);
  });
});

describe("institution ids", () => {
  it("round-trips a country and an ASPSP name", () => {
    // An ASPSP is addressed by {name, country}, not an opaque id, and `ConsentRequest` carries no
    // country field — so the pair travels packed inside the id the picker round-trips.
    const id = encodeInstitutionId("pt", "Banco BPI");
    expect(id).toBe("PT:Banco BPI");
    expect(decodeInstitutionId(id)).toEqual({ country: "PT", name: "Banco BPI" });
  });

  it("keeps names containing spaces and punctuation intact", () => {
    const id = encodeInstitutionId("ES", "Banco Bilbao Vizcaya Argentaria, S.A.");
    expect(decodeInstitutionId(id).name).toBe("Banco Bilbao Vizcaya Argentaria, S.A.");
  });

  it("rejects an id that is not in the expected form", () => {
    expect(() => decodeInstitutionId("BancoBPI")).toThrow();
    expect(() => decodeInstitutionId(":no-country")).toThrow();
  });
});

/**
 * These fixtures encode assumptions about the transaction payload, NOT a recording. Enable
 * Banking's own published sample prints transactions without showing their shape, so the field
 * names come from their API reference and the sign convention is handled both ways rather than
 * guessed one way. `scripts/enablebanking-check.mjs` exists to replace this with a recording.
 */
describe("mapping a transaction", () => {
  const base: EnableBankingTransaction = {
    booking_date: "2026-08-01",
    transaction_amount: { amount: "750.00", currency: "EUR" },
  };

  it("treats CRDT as money in and reads the debtor as the counterparty", () => {
    const row = mapTransaction({
      ...base,
      credit_debit_indicator: "CRDT",
      debtor: { name: "Ana Silva" },
      debtor_account: { iban: "PT50000201239999999999999" },
      remittance_information: ["RENDA", "AGOSTO"],
    });

    expect(row?.amount).toBe(750);
    expect(row?.counterpartyName).toBe("Ana Silva");
    expect(row?.counterpartyIban).toBe("PT50000201239999999999999");
    // The array form is joined rather than dropped: PT and ES banks split references across it
    // about as often as they use a single string.
    expect(row?.reference).toBe("RENDA AGOSTO");
  });

  it("treats DBIT as money out and reads the creditor as the counterparty", () => {
    const row = mapTransaction({
      ...base,
      transaction_amount: { amount: "120.50", currency: "EUR" },
      credit_debit_indicator: "DBIT",
      creditor: { name: "EDP Comercial" },
      remittance_information: "FATURA LUZ",
    });

    expect(row?.amount).toBe(-120.5);
    expect(row?.counterpartyName).toBe("EDP Comercial");
    expect(row?.reference).toBe("FATURA LUZ");
  });

  it("normalises an amount whose sign contradicts the indicator", () => {
    // Some ASPSPs send a signed amount AND an indicator. The indicator is the authority; taking
    // the sign on trust would flip a payment into a charge, which mis-matches rent silently.
    const row = mapTransaction({
      ...base,
      transaction_amount: { amount: "-750.00", currency: "EUR" },
      credit_debit_indicator: "CRDT",
    });
    expect(row?.amount).toBe(750);
  });

  it("honours a signed amount when no indicator is present", () => {
    const row = mapTransaction({
      ...base,
      transaction_amount: { amount: "-42.00", currency: "EUR" },
    });
    expect(row?.amount).toBe(-42);
  });

  it("falls back to the value date when the booking date is absent", () => {
    const row = mapTransaction({
      transaction_amount: { amount: "10.00" },
      value_date: "2026-08-05",
    });
    expect(row?.bookingDate).toBe("2026-08-05");
  });

  it("drops a row with no amount or no date rather than importing a broken one", () => {
    // A fingerprint built from undefined would collide with every other broken row, quietly
    // deduping unrelated movements into one.
    expect(mapTransaction({ booking_date: "2026-08-01" })).toBeNull();
    expect(mapTransaction({ transaction_amount: { amount: "10.00" } })).toBeNull();
    expect(
      mapTransaction({ booking_date: "2026-08-01", transaction_amount: { amount: "abc" } }),
    ).toBeNull();
  });

  it("falls back to the other party when a bank populates only one side", () => {
    const row = mapTransaction({
      ...base,
      credit_debit_indicator: "CRDT",
      creditor: { name: "Only Side Given" },
    });
    expect(row?.counterpartyName).toBe("Only Side Given");
  });
});
