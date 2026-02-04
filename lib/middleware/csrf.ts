/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * 
 * Uses the "Double Submit Cookie" pattern:
 * 1. Generate a random CSRF token
 * 2. Send it as both a cookie and in response body
 * 3. Verify the token matches on state-changing requests (POST, PUT, DELETE, PATCH)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Get CSRF token from request cookies
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_TOKEN_NAME)?.value || null;
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME) || null;
}

/**
 * Verify CSRF token matches between cookie and header
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch {
    // Tokens are different lengths
    return false;
  }
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  return protectedMethods.includes(method.toUpperCase());
}

/**
 * CSRF middleware - validates CSRF token on state-changing requests
 * 
 * @param request - The incoming request
 * @returns Response with 403 error if CSRF validation fails, null if validation passes
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const csrfError = await csrfProtection(request);
 *   if (csrfError) return csrfError;
 *   
 *   // Continue with request handling...
 * }
 * ```
 */
export async function csrfProtection(request: NextRequest): Promise<Response | null> {
  // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
  if (!requiresCsrfProtection(request.method)) {
    return null;
  }

  // Verify CSRF token
  if (!verifyCsrfToken(request)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid CSRF token',
        message: 'CSRF token missing or invalid. Please refresh and try again.',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}

/**
 * Set CSRF token cookie in response
 * 
 * @param response - The response to modify
 * @param token - The CSRF token to set (generates new one if not provided)
 * @returns Modified response with CSRF cookie
 */
export function setCsrfCookie(response: NextResponse, token?: string): NextResponse {
  const csrfToken = token || generateCsrfToken();
  
  response.cookies.set(CSRF_TOKEN_NAME, csrfToken, {
    httpOnly: false, // Must be readable by JavaScript to send in headers
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // Strict same-site policy
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}

/**
 * Get or generate CSRF token for the current request
 * Returns existing token from cookie or generates a new one
 */
export function getOrGenerateCsrfToken(request: NextRequest): string {
  return getCsrfTokenFromCookie(request) || generateCsrfToken();
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 * 
 * @example
 * ```typescript
 * export const POST = withCsrfProtection(async (request) => {
 *   // Handler code - CSRF already validated
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const csrfError = await csrfProtection(request);
    if (csrfError) return csrfError;
    
    return handler(request);
  };
}
