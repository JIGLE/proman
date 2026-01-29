import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';

// Mock providers for tests with proper context
const MockCurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="mock-currency-provider">
      {children}
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
