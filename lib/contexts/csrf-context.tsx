"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useCsrfToken } from '@/lib/hooks/use-csrf-token';

interface CsrfContextType {
  token: string | null;
  isLoading: boolean;
  error: Error | null;
  refreshToken: () => Promise<void>;
}

const CsrfContext = createContext<CsrfContextType | undefined>(undefined);

/**
 * Provider for CSRF token management
 * 
 * Wraps the application to provide CSRF tokens to all components
 */
export function CsrfProvider({ children }: { children: ReactNode }): React.ReactElement {
  const csrf = useCsrfToken();

  return (
    <CsrfContext.Provider value={csrf}>
      {children}
    </CsrfContext.Provider>
  );
}

/**
 * Hook to access CSRF token from context
 * 
 * @throws Error if used outside CsrfProvider
 * 
 * @example
 * ```tsx
 * const { token, isLoading } = useCsrf();
 * 
 * if (isLoading) return <Loading />;
 * 
 * const response = await fetch('/api/data', {
 *   method: 'POST',
 *   headers: { 'X-CSRF-Token': token || '' },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function useCsrf(): CsrfContextType {
  const context = useContext(CsrfContext);
  
  if (context === undefined) {
    throw new Error('useCsrf must be used within a CsrfProvider');
  }
  
  return context;
}
