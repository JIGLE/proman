import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';

// Mock providers for tests with proper context
const MockCurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const mockCurrencyContext = {
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
    currency: 'USD' as const,
    setCurrency: () => {},
  };
  
  return (
    <div data-testid="mock-currency-provider">
      {React.cloneElement(children as React.ReactElement, {
        'data-currency-context': JSON.stringify(mockCurrencyContext)
      })}
    </div>
  );
};

const MockToastProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export function renderWithProviders(ui: React.ReactElement, options?: any) {
  const wrapped = (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MockCurrencyProvider>
        <MockToastProvider>{ui}</MockToastProvider>
      </MockCurrencyProvider>
    </NextIntlClientProvider>
  );
  return render(wrapped, options);
}

export * from '@testing-library/react';
