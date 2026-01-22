import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './lib/i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Automatically detect the user's locale based on:
  // 1. The `Accept-Language` header
  // 2. Cookies (if configured)
  localeDetection: true
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(en|es|fr|de|it|pt|nl|sv)/:path*']
};