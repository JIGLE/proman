/**
 * Proxy for Next.js 16+ locale routing and URL redirects
 * Handles:
 * - Locale prefix enforcement (always use /en or /pt)
 * - Backward compatibility redirects from old tab-based URLs
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './lib/i18n/config';

/**
 * Generate CSP nonce (Edge-compatible version)
 * Uses Web Crypto API available in Edge runtime
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse, nonce: string): void {
  const headers = response.headers;

  // Pass nonce to the app via custom header
  headers.set('x-nonce', nonce);

  // HSTS: Force HTTPS for 1 year (production only)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // X-Frame-Options: Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: Prevent MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection: Legacy XSS protection
  headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy: Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy: Disable unnecessary features
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content-Security-Policy with nonces (strict CSP)
  const isDev = process.env.NODE_ENV === 'development';
  
  const cspDirectives = [
    "default-src 'self'",
    // Script sources - nonce-based for inline scripts, eval only in dev
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://apis.google.com${isDev ? " 'unsafe-eval'" : ''}`,
    // Style sources - unsafe-inline required for React DOM, Framer Motion, and CSS-in-JS libs
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://accounts.google.com https://api.stripe.com${isDev ? ' http://localhost:*' : ''}`,
    "frame-src 'self' https://accounts.google.com https://js.stripe.com",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    // Only upgrade insecure requests in production (avoids https://localhost errors in dev)
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join('; ');

  headers.set('Content-Security-Policy', cspDirectives);
}

export function proxy(request: NextRequest) {
  // Generate unique nonce for this request
  const nonce = generateNonce();
  
  const { pathname, searchParams } = request.nextUrl;

  // Handle old tab-based URL redirects (backward compatibility)
  const tab = searchParams.get('tab');
  if (tab) {
    // Extract locale from pathname (e.g., /en, /pt, or root)
    const localeMatch = pathname.match(/^\/(en|pt)/);
    const locale = localeMatch ? localeMatch[1] : defaultLocale;
    
    // Map old tab names to new routes
    const tabRouteMap: Record<string, string> = {
      'overview': '/dashboard',
      'properties': '/properties',
      'tenants': '/tenants',
      'leases': '/leases',
      'financials': '/financials',
      'receipts': '/financials/receipts',
      'expenses': '/financials/expenses',
      'invoices': '/financials/invoices',
      'payment-matrix': '/financials/payment-matrix',
      'maintenance': '/maintenance',
      'owners': '/owners',
      'correspondence': '/correspondence',
      'reports': '/reports',
      'analytics': '/analytics',
      'settings': '/settings',
      'profile': '/settings/profile',
      'preferences': '/settings/preferences',
      'admin': '/settings/admin',
    };

    const newPath = tabRouteMap[tab];
    if (newPath) {
      // Build new URL with locale prefix
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${newPath}`;
      
      // Preserve other query params (like search, status, etc.)
      url.searchParams.delete('tab');
      url.searchParams.delete('subtab'); // Remove old subtab param too
      
      const response = NextResponse.redirect(url, 301); // Permanent redirect
      applySecurityHeaders(response, nonce);
      return response;
    }
  }

  // Handle old subtab-based URLs for financials
  const subtab = searchParams.get('subtab');
  if (subtab && pathname.includes('financials')) {
    const localeMatch = pathname.match(/^\/(en|pt)/);
    const locale = localeMatch ? localeMatch[1] : defaultLocale;
    
    const subtabRouteMap: Record<string, string> = {
      'receipts': '/financials/receipts',
      'expenses': '/financials/expenses',
      'invoices': '/financials/invoices',
      'payment-matrix': '/financials/payment-matrix',
    };

    const newPath = subtabRouteMap[subtab];
    if (newPath) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${newPath}`;
      url.searchParams.delete('subtab');
      const response = NextResponse.redirect(url, 301);
      applySecurityHeaders(response, nonce);
      return response;
    }
  }

  // Check if pathname already starts with a supported locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  let response: NextResponse;

  // If path has locale, let it through
  if (pathnameHasLocale) {
    response = NextResponse.next();
  } else if (pathname === '/') {
    // If path is just /, redirect to /en
    response = NextResponse.redirect(
      new URL(`/${defaultLocale}`, request.url),
      { status: 307 }
    );
  } else {
    // For any other path without locale, prepend default locale
    // This handles /path -> /en/path
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    response = NextResponse.redirect(url, { status: 307 });
  }

  // Apply security headers to all responses
  applySecurityHeaders(response, nonce);
  
  return response;
}

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/*)
  // - Auth routes (/auth/*) - NextAuth needs these without locale prefix
  // - _next (Next.js internals)
  // - Static files (images, fonts, etc.)
  matcher: [
    '/((?!api|auth|_next/static|_next/image|favicon.ico|version\.json|.*\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
};
