import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

// Proxy pattern for Next.js 16+ - handle locale routing with redirects
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

// Configuration for which routes to apply the proxy to
export const config = {
  matcher: [
    // Match all pathnames except:
    // - api routes
    // - auth routes (NextAuth pages)
    // - _next internals
    // - _vercel internals  
    // - _static folder
    // - static files
    '/((?!api|auth|_next|_vercel|_static|.*\..*|favicon\.ico|robots\.txt|sitemap\.xml).)*',
  ],
};
