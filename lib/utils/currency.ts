/**
 * Currency formatting utilities
 * Provides consistent currency display across the application
 */

// Currency type matching database schema
export type Currency = 'EUR' | 'DKK' | 'USD' | 'GBP';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  DKK: 'kr',
  USD: '$',
  GBP: '£',
};

export const CURRENCY_LOCALES: Record<Currency, string> = {
  EUR: 'pt-PT',
  DKK: 'da-DK',
  USD: 'en-US',
  GBP: 'en-GB',
};

export interface FormatCurrencyOptions {
  currency: Currency;
  showSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format a number as currency with proper localization
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: FormatCurrencyOptions
): string {
  if (amount === null || amount === undefined) {
    return '-';
  }

  const {
    currency,
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const locale = CURRENCY_LOCALES[currency];
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);

  if (showSymbol) {
    const symbol = CURRENCY_SYMBOLS[currency];
    // DKK symbol typically goes after the amount
    if (currency === 'DKK') {
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
  const cleaned = value.replace(/[^\d.,-]/g, '');
  
  // Handle European format (comma as decimal separator)
  const normalized = cleaned.replace(',', '.');
  
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}
