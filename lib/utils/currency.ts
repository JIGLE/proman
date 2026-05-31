/**
 * Currency formatting utilities
 * Provides consistent currency display across the application
 */

// Currency type matching database schema
export type Currency = "EUR" | "DKK" | "USD" | "GBP";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  DKK: "kr",
  USD: "$",
  GBP: "£",
};

// Default currency locales — used when no user locale preference is available
export const CURRENCY_LOCALES: Record<Currency, string> = {
  EUR: "pt-PT",
  DKK: "da-DK",
  USD: "en-US",
  GBP: "en-GB",
};

/**
 * Get the appropriate locale for a currency based on the user's locale preference.
 * EUR formatting varies by country (pt-PT uses "1.234,56 €", es-ES uses "1.234,56 €", en-IE uses "€1,234.56")
 */
export function getCurrencyLocale(currency: Currency, userLocale?: string): string {
  if (!userLocale) return CURRENCY_LOCALES[currency];

  // For EUR, use the user's locale variant
  if (currency === "EUR") {
    const localeMap: Record<string, string> = {
      pt: "pt-PT",
      es: "es-ES",
      en: "en-IE", // Irish English for EUR formatting
    };
    return localeMap[userLocale] ?? CURRENCY_LOCALES[currency];
  }

  return CURRENCY_LOCALES[currency];
}

export interface FormatCurrencyOptions {
  currency: Currency;
  showSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  userLocale?: string;
}

/**
 * Format a number as currency with proper localization
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: FormatCurrencyOptions,
): string {
  if (amount === null || amount === undefined) {
    return "-";
  }

  const {
    currency,
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    userLocale,
  } = options;

  const locale = getCurrencyLocale(currency, userLocale);

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);

  if (showSymbol) {
    const symbol = CURRENCY_SYMBOLS[currency];
    // DKK symbol typically goes after the amount
    if (currency === "DKK") {
      return `${formatted} ${symbol}`;
    }
    // EUR, USD, GBP go before
    return `${symbol}${formatted}`;
  }

  return formatted;
}

/**
 * Get currency symbol for a given currency
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

/**
 * Parse currency string back to number (removes symbols and formatting)
 */
export function parseCurrency(value: string): number | null {
  // Remove all non-digit characters except decimal point and minus sign
  const cleaned = value.replace(/[^\d.,-]/g, "");

  // Handle European format (comma as decimal separator)
  const normalized = cleaned.replace(",", ".");

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}
