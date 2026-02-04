'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type Currency, formatCurrency as formatCurrencyUtil, CURRENCY_LOCALES } from '@/lib/utils/currency';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number | null | undefined) => string;
  locale: string; // Now derived from URL, read-only for formatting
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

interface CurrencyProviderProps {
  children: React.ReactNode;
  initialCurrency?: Currency;
  initialLocale?: string;
}

export function CurrencyProvider({
  children,
  initialCurrency = 'EUR',
  initialLocale = 'en'
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);
  const [isLoading, setIsLoading] = useState(true);
  // Locale now comes from URL via initialLocale prop (from useParams in layout)
  const [locale] = useState(initialLocale);

  // Load currency from UserSettings API on mount
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.defaultCurrency) {
            setCurrencyState(data.defaultCurrency as Currency);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user currency:', error);
        // Fall back to initialCurrency on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrency();
  }, []);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    
    // Save to UserSettings via API
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultCurrency: newCurrency }),
      });
    } catch (error) {
      console.error('Failed to save currency:', error);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    return formatCurrencyUtil(amount, { currency });
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatCurrency,
        locale, // Read-only, derived from URL
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
