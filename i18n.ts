import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import enMessages from '@/messages/en.json';
import ptMessages from '@/messages/pt.json';

const messages: Record<string, any> = {
  en: enMessages,
  pt: ptMessages,
};

export default getRequestConfig(async ({ locale }) => {
  if (!['en', 'pt'].includes(locale as string)) notFound();

  return {
    locale: locale as string,
    messages: messages[locale as string],
  };
});