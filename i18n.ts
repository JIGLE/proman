import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import enMessages from '@/messages/en.json';
import ptMessages from '@/messages/pt.json';

// Export locales for use in middleware and layouts
export const locales = ['en', 'pt'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const messages: Record<string, any> = {
  en: enMessages,
  pt: ptMessages,
};

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