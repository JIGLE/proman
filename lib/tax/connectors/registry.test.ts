import { describe, it, expect } from "vitest";
import {
  DEFAULT_COUNTRY,
  filesRentReceipts,
  getTaxConnector,
  registeredCountries,
  resolveCountry,
} from "./registry";

/**
 * The registry exists so no domain service names a tax authority. `receipts/service.ts` used to
 * `import { ptAtConnector }` and call it directly, which is the §9 violation the V1 brief cares
 * about.
 *
 * The country-normalisation cases are not pedantry: `Property.country` is
 * `String? @default("PT")` — nullable — so rows written before the column existed carry null.
 * Defaulting those anywhere but PT would silently re-route existing Portuguese properties.
 */

describe("country normalisation", () => {
  it("treats a null or absent country as PT, preserving pre-column rows", () => {
    expect(resolveCountry(null)).toBe(DEFAULT_COUNTRY);
    expect(resolveCountry(undefined)).toBe("PT");
    expect(resolveCountry("")).toBe("PT");
    expect(resolveCountry("   ")).toBe("PT");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveCountry("es")).toBe("ES");
    expect(resolveCountry(" Pt ")).toBe("PT");
  });
});

describe("connector resolution", () => {
  it("resolves each registered country to its own connector", () => {
    expect(getTaxConnector("PT")?.country).toBe("PT");
    expect(getTaxConnector("ES")?.country).toBe("ES");
  });

  it("routes a null country to Portugal", () => {
    expect(getTaxConnector(null)?.country).toBe("PT");
  });

  it("returns undefined for a country with no connector, rather than guessing", () => {
    expect(getTaxConnector("FR")).toBeUndefined();
    expect(getTaxConnector("IT")).toBeUndefined();
  });

  it("lists exactly the countries that have one", () => {
    expect(registeredCountries()).toEqual(["ES", "PT"]);
  });
});

describe("which countries file rent receipts", () => {
  // Portugal files a Modelo 44 rent receipt per payment. Spain files an NRUA registration
  // against the LEASE — a different object, authority and schedule. The receipt lifecycle
  // allows emitted → submitted for any receipt, so this predicate is the only thing keeping an
  // ES receipt off the Portuguese filing path.
  it("is Portugal only", () => {
    expect(filesRentReceipts("PT")).toBe(true);
    expect(filesRentReceipts(null)).toBe(true);
    expect(filesRentReceipts("ES")).toBe(false);
  });

  it("does not claim it for a country with no connector at all", () => {
    expect(filesRentReceipts("FR")).toBe(false);
  });
});
