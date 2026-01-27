import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import enMessages from '@/messages/en.json';
import ptMessages from '@/messages/pt.json';

// Export locales for use in middleware and layouts
export const locales = ['en', 'pt'] as const;
export const defaultLocale = 'en' as const;

const messages: Record<string, any> = {
  en: enMessages,
  pt: ptMessages,
};

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    locale: locale as string,
    messages: messages[locale as string],
  };
});