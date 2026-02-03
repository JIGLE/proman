/**
 * Internationalization (i18n) configuration
 * Moved from root i18n.ts for better organization
 */

import { notFound as _notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import enMessages from '@/messages/en.json';
import ptMessages from '@/messages/pt.json';

// Supported locales
export const locales = ['en', 'pt'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

// Language display names
export const localeNames: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
};

// Coming soon languages (for display in selector)
export const upcomingLocales = ['es', 'fr', 'de', 'it', 'nl', 'pl', 'ru', 'zh', 'ja'] as const;
export const upcomingLocaleNames: Record<string, string> = {
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
};

// Message bundles - typed for next-intl compatibility
const messages = {
  en: enMessages,
  pt: ptMessages,
} as const;

// Next-intl configuration
export default getRequestConfig(async ({ requestLocale }) => {
  // Get the requested locale from the URL
  const requested = await requestLocale;
  
  // Validate and fallback to default if needed
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  return {
    locale,
    messages: messages[locale],
  };
});
