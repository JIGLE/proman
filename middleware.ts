/**
 * Middleware for Next.js 16+ locale routing and URL redirects
 * Handles:
 * - Locale prefix enforcement (always use /en or /pt)
 * - Backward compatibility redirects from old tab-based URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './lib/i18n/config';

export function middleware(request: NextRequest) {
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
      
      return NextResponse.redirect(url, 301); // Permanent redirect
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
      return NextResponse.redirect(url, 301);
    }
  }

  // Check if pathname already starts with a supported locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // If path has locale, let it through
  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // If path is just /, redirect to /en
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(`/${defaultLocale}`, request.url),
      { status: 307 }
    );
  }

  // For any other path without locale, prepend default locale
  // This handles /path -> /en/path
  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.redirect(url, { status: 307 });
}

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/*)
  // - Auth routes (/auth/*) - NextAuth needs these without locale prefix
  // - _next (Next.js internals)
  // - Static files (images, fonts, etc.)
  matcher: ['/((?!api|auth|_next|.*\\..*).*)'],
};
