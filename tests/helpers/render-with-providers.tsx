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

// Create a mock theme context
const MockThemeContext = React.createContext({
  theme: 'light' as const,
  setTheme: () => {},
  systemTheme: 'light' as const,
});

const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const value = {
    theme: 'light' as const,
    setTheme: () => {},
    systemTheme: 'light' as const,
  };
  
  return (
    <MockThemeContext.Provider value={value}>
      <div data-testid="mock-theme-provider" data-theme="light">
        {children}
      </div>
    </MockThemeContext.Provider>
  );
};

export function renderWithProviders(ui: React.ReactElement, options?: any) {
  const wrapped = (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MockThemeProvider>
        <MockCurrencyProvider>
          <MockToastProvider>{ui}</MockToastProvider>
        </MockCurrencyProvider>
      </MockThemeProvider>
    </NextIntlClientProvider>
  );
  return render(wrapped, options);
}

export * from '@testing-library/react';
