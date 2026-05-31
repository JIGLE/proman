/**
 * Canonical country code registry for Portugal and Spain
 *
 * Single source of truth for country codes, display names, locales,
 * and tax-ID metadata. All country-aware code should import from here
 * instead of scattering string comparisons across the codebase.
 */

export type CountryCode = "PT" | "ES";

export const COUNTRY_CONFIG: Record<
  CountryCode,
  {
    name: Record<string, string>; // locale -> display name
    locale: string;
    currency: "EUR";
    taxIdName: string;
    taxIdFormat: string;
  }
> = {
  PT: {
    name: { en: "Portugal", pt: "Portugal", es: "Portugal" },
    locale: "pt-PT",
    currency: "EUR",
    taxIdName: "NIF",
    taxIdFormat: "9 digits",
  },
  ES: {
    name: { en: "Spain", pt: "Espanha", es: "España" },
    locale: "es-ES",
    currency: "EUR",
    taxIdName: "NIF/NIE",
    taxIdFormat: "Letter + 7 digits + letter",
  },
};

/** Map display names / codes to canonical ISO 3166-1 alpha-2 country codes */
export function resolveCountryCode(input: string): CountryCode {
  const map: Record<string, CountryCode> = {
    PT: "PT",
    ES: "ES",
    Portugal: "PT",
    Spain: "ES",
    portugal: "PT",
    spain: "ES",
    PORTUGAL: "PT",
    SPAIN: "ES",
  };
  const resolved = map[input];
  if (!resolved) throw new Error(`Unsupported country: ${input}`);
  return resolved;
}

/** Get display name for a country code in the given locale */
export function getCountryName(code: CountryCode, locale: string = "en"): string {
  return COUNTRY_CONFIG[code]?.name[locale] ?? COUNTRY_CONFIG[code]?.name.en ?? code;
}

/** Get the default locale string for a country (e.g. "pt-PT") */
export function getCountryLocale(code: CountryCode): string {
  return COUNTRY_CONFIG[code].locale;
}
