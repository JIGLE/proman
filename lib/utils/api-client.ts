/**
 * Secure API Client with CSRF Protection
 *
 * Provides type-safe API calls with automatic CSRF token injection
 */

import { logger } from "./logger";

interface ApiClientOptions extends RequestInit {
  csrfToken?: string | null;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Enhanced fetch wrapper with CSRF token support
 *
 * Supports two call signatures:
 * 1. apiFetch(url, options) - Full options object
 * 2. apiFetch(url, csrfToken, method, body) - Convenient signature for CRUD operations
 *
 * @param url - API endpoint URL
 * @param csrfTokenOrOptions - CSRF token string or full options object
 * @param httpMethod - HTTP method (only used with signature 2)
 * @param body - Request body (only used with signature 2)
 * @returns Parsed JSON response
 */
export async function apiFetch<T = unknown>(
  url: string,
  csrfTokenOrOptions?: string | null | ApiClientOptions,
  httpMethod?: string,
  body?: unknown,
  isRetry?: boolean,
): Promise<T> {
  // Determine if using signature 1 (options object) or signature 2 (separate params)
  let options: ApiClientOptions;

  if (
    typeof csrfTokenOrOptions === "object" ||
    csrfTokenOrOptions === undefined
  ) {
    // Signature 1: apiFetch(url, options)
    options = csrfTokenOrOptions || {};
  } else {
    // Signature 2: apiFetch(url, csrfToken, method, body)
    options = {
      method: httpMethod || "GET",
      csrfToken: csrfTokenOrOptions,
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
  }

  const { csrfToken, headers, ...restOptions } = options;

  // Build headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Add CSRF token for state-changing methods
  const httpVerb = (options.method || "GET").toUpperCase();
  const requiresCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(httpVerb);

  if (requiresCsrf && csrfToken) {
    requestHeaders["X-CSRF-Token"] = csrfToken;
  } else if (requiresCsrf && !csrfToken) {
    // Fail fast for state-changing requests without CSRF token
    const error = new Error(
      "CSRF token not available. Please refresh the page and try again.",
    );
    const typedError = error as Error & { status: number };
    typedError.status = 403; // Use 403 Forbidden for CSRF failure
    logger.error("CSRF token missing for state-changing request", {
      url,
      method: httpVerb,
    });
    throw typedError;
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      method: httpVerb,
      headers: requestHeaders,
      credentials: "include", // Always include cookies
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        error: response.statusText,
      }))) as ApiResponse;

      const errorMessage =
        errorData.error || errorData.message || "API request failed";
      const error = new Error(errorMessage);
      const typedError = error as Error & { status: number; detail?: string };
      typedError.status = response.status;
      if ((errorData as ApiResponse & { detail?: string }).detail) {
        typedError.detail = (
          errorData as ApiResponse & { detail?: string }
        ).detail;
      }

      // For 503 (service unavailable), retry once after a short delay
      if (response.status === 503 && !isRetry) {
        logger.warn("Service unavailable, retrying in 1s", {
          url,
          method: httpVerb,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return apiFetch<T>(url, csrfTokenOrOptions, httpMethod, body, true);
      }

      throw typedError;
    }

    // Parse response
    const data = (await response.json()) as ApiResponse<T>;

    // Return data field if present, otherwise return entire response
    return (data.data !== undefined ? data.data : data) as T;
  } catch (error) {
    logger.error(
      "API request failed",
      error instanceof Error ? error : new Error(String(error)),
      {
        url,
        method: httpVerb,
      },
    );
    throw error;
  }
}

/**
 * Type-safe API client with CSRF protection
 */
export class ApiClient {
  private csrfToken: string | null = null;

  constructor(csrfToken?: string | null) {
    this.csrfToken = csrfToken || null;
  }

  /**
   * Update CSRF token
   */
  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: "GET",
      csrfToken: this.csrfToken,
    });
  }

  /**
   * POST request with CSRF protection
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      csrfToken: this.csrfToken,
    });
  }

  /**
   * PUT request with CSRF protection
   */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      csrfToken: this.csrfToken,
    });
  }

  /**
   * PATCH request with CSRF protection
   */
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      csrfToken: this.csrfToken,
    });
  }

  /**
   * DELETE request with CSRF protection
   */
  async delete<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: "DELETE",
      csrfToken: this.csrfToken,
    });
  }
}

/**
 * Create an API client instance with CSRF token
 */
export function createApiClient(csrfToken?: string | null): ApiClient {
  return new ApiClient(csrfToken);
}
