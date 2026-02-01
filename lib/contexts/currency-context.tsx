'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number) => string;
  locale: string; // Now derived from URL, read-only for formatting
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
  initialCurrency?: string;
  initialLocale?: string;
}

export function CurrencyProvider({
  children,
  initialCurrency = 'USD',
  initialLocale = 'en'
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState(initialCurrency);
  // Locale now comes from URL via initialLocale prop (from useParams in layout)
  // We don't manage it in localStorage anymore
  const [locale] = useState(initialLocale);

  // Load only currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('proman_currency');
    if (savedCurrency) setCurrencyState(savedCurrency);
  }, []);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('proman_currency', newCurrency);
  };

  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback if currency/locale combination is invalid
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatCurrency,
        locale, // Read-only, derived from URL
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
