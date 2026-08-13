import type { TaxConnector } from "./types";
import { ptAtConnector } from "./pt-at";
import { esNruaConnector } from "./es-nrua";

/**
 * Country → tax connector.
 *
 * WHY THIS EXISTS. `lib/services/receipts/service.ts` used to `import { ptAtConnector }` and
 * call it directly at two sites, which meant the receipt domain named a specific tax authority.
 * Adding a second country made that untenable: it is not that Portugal was hardcoded by
 * accident, it is that there was nowhere else for the decision to live.
 *
 * Adding a country is now: implement TaxConnector, register it here, done — no edit to any
 * domain service.
 */
const CONNECTORS: Record<string, TaxConnector> = {
  PT: ptAtConnector,
  ES: esNruaConnector,
};

/**
 * `Property.country` is `String? @default("PT")` — nullable, so rows written before the column
 * existed carry null. Those are Portuguese properties in practice, and defaulting them
 * anywhere else would silently change behaviour for existing data.
 */
export const DEFAULT_COUNTRY = "PT";

/** Normalise a possibly-null, possibly-lowercase country code. */
export function resolveCountry(country: string | null | undefined): string {
  return (country ?? DEFAULT_COUNTRY).trim().toUpperCase() || DEFAULT_COUNTRY;
}

/** The connector for a country, or undefined when that country has none. */
export function getTaxConnector(country: string | null | undefined): TaxConnector | undefined {
  return CONNECTORS[resolveCountry(country)];
}

/** Country codes with a registered connector — used by the UI to list what exists. */
export function registeredCountries(): string[] {
  return Object.keys(CONNECTORS).sort();
}

/**
 * Whether a country's connector files RENT RECEIPTS, i.e. participates in the receipt
 * lifecycle's submitted/accepted transitions.
 *
 * Portugal files a Modelo 44 rent receipt per payment. Spain files an NRUA lease registration —
 * a different object, on a different schedule, with a different authority — so an ES receipt
 * must not be pushed down the rent-receipt path. `evaluateTransition` allows
 * `emitted → submitted` for any receipt, so without this check an ES property would silently
 * invoke the wrong country's filing.
 */
export function filesRentReceipts(country: string | null | undefined): boolean {
  return resolveCountry(country) === "PT";
}
