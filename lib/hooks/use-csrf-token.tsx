"use client";

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

interface UseCsrfTokenReturn {
  token: string | null;
  isLoading: boolean;
  error: Error | null;
  refreshToken: () => Promise<void>;
}

/**
 * Hook to manage CSRF tokens for secure API requests
 * 
 * Features:
 * - Automatically fetches token on mount
 * - Refreshes token before expiration (24h default)
 * - Provides manual refresh function
 * - Handles errors gracefully
 * 
 * Usage:
 * ```tsx
 * const { token, isLoading, error, refreshToken } = useCsrfToken();
 * 
 * // In API call
 * await fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'X-CSRF-Token': token || '',
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function useCsrfToken(): UseCsrfTokenReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('CSRF token not found in response');
      }

      setToken(data.token);
      logger.debug('CSRF token fetched successfully');
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      logger.error('Failed to fetch CSRF token', errorObj);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch token on mount
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Auto-refresh token every 23 hours (before 24h expiration)
  useEffect(() => {
    if (!token) return;

    const refreshInterval = 23 * 60 * 60 * 1000; // 23 hours in milliseconds
    const intervalId = setInterval(() => {
      logger.debug('Auto-refreshing CSRF token');
      fetchToken();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [token, fetchToken]);

  return {
    token,
    isLoading,
    error,
    refreshToken: fetchToken,
  };
}
