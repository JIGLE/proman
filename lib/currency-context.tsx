'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number) => string;
  locale: string;
  setLocale: (locale: string) => void;
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
  const [locale, setLocaleState] = useState(initialLocale);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('currency');
    const savedLocale = localStorage.getItem('locale');

    if (savedCurrency) setCurrencyState(savedCurrency);
    if (savedLocale) setLocaleState(savedLocale);
  }, []);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);
  };

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
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
        locale,
        setLocale,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}