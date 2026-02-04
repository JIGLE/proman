/**
 * CSRF Token API
 * Provides CSRF tokens to frontend for protecting state-changing requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfCookie, getOrGenerateCsrfToken } from '@/lib/middleware/csrf';

/**
 * GET /api/csrf-token
 * Returns a CSRF token for the client to use in subsequent requests
 */
export async function GET(request: NextRequest): Promise<Response> {
  // Get existing token or generate new one
  const token = getOrGenerateCsrfToken(request);
  
  // Create response with token
  const response = NextResponse.json({
    csrfToken: token,
  });

  // Set CSRF cookie
  setCsrfCookie(response, token);

  return response;
}
