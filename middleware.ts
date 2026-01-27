import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Used to prefix locale to routes (ensures /en/page, /pt/page structure)
  localePrefix: 'always',
});

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for:
    // - api (API routes)
    // - _next (Next.js internals)
    // - _vercel (Vercel internals)
    // - _static (static files)
    // - files with extensions (e.g., favicon.ico)
    '/((?!api|_next|_vercel|_static|.*\\..*).)*',
  ],
};
