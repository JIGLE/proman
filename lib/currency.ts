export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  PT: 'EUR', // Portugal
  ES: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  LU: 'EUR',
  AT: 'EUR',
  GR: 'EUR',
  IE: 'EUR',
  GB: 'GBP',
  UK: 'GBP',
  US: 'USD',
  CA: 'CAD',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  HR: 'HRK',
  TR: 'TRY',
  RU: 'RUB',
  UA: 'UAH',
};

export function getCurrencyForCountry(countryCode?: string): string {
  if (!countryCode) return 'EUR';
  const key = countryCode.toUpperCase();
  return COUNTRY_TO_CURRENCY[key] || 'EUR';
}

export function formatCurrency(value: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency }).format(value);
  } catch {
    // Fallback: simple fixed formatting
    const rounded = Number.isFinite(value) ? value.toFixed(2) : String(value);
    return `${currency} ${rounded}`;
  }
}

export const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'Fr',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  HRK: 'kn',
  TRY: '₺',
  RUB: '₽',
  UAH: '₴',
  ISK: 'kr',
  MKD: 'ден',
  RSD: 'дин',
  ALL: 'L',
};

export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '€';
  const key = currency.toUpperCase();
  return CURRENCY_SYMBOL[key] || currency;
}

export default {
  getCurrencyForCountry,
  formatCurrency,
  getCurrencySymbol,
};
