import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

// Use the proxy pattern for Next.js 16+ instead of deprecated middleware
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if pathname already starts with a supported locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Pathname already has locale, let it through
    return NextResponse.next();
  }

  // Rewrite to add default locale
  // This is the "proxy" pattern - internally rewriting the request
  return NextResponse.rewrite(
    new URL(`/${defaultLocale}${pathname}`, request.url)
  );
}

// Configuration for which routes to apply the proxy to
export const config = {
  matcher: [
    // Match all pathnames except:
    // - api routes
    // - _next internals
    // - _vercel internals  
    // - _static folder
    // - static files
    '/((?!api|_next|_vercel|_static|.*\\..*|favicon\\.ico|robots\\.txt|sitemap\\.xml).)*',
  ],
};
