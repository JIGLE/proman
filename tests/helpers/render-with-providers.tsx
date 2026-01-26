import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import { CurrencyProvider } from '../../lib/currency-context';

export function renderWithProviders(ui: React.ReactElement, options?: any) {
  const wrapped = (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <CurrencyProvider>{ui}</CurrencyProvider>
    </NextIntlClientProvider>
  );
  return render(wrapped, options);
}

export * from '@testing-library/react';
