/**
 * Hook to access user's preferred currency and formatting utilities
 */

import { useEffect, useState } from 'react';
import { type Currency, formatCurrency, FormatCurrencyOptions } from '@/lib/utils/currency';

export function useUserCurrency() {
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch user settings to get default currency
    const fetchCurrency = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setCurrency(data.defaultCurrency || 'EUR');
        }
      } catch (error) {
        console.error('Failed to fetch user currency:', error);
        // Default to EUR on error
        setCurrency('EUR');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrency();
  }, []);

  /**
   * Format amount with user's preferred currency
   */
  const format = (
    amount: number | null | undefined,
    options?: Partial<Omit<FormatCurrencyOptions, 'currency'>>
  ): string => {
    return formatCurrency(amount, {
      currency,
      ...options,
    });
  };

  return {
    currency,
    isLoading,
    format,
  };
}
