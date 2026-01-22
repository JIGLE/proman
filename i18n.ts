import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  if (!['en', 'pt', 'es'].includes(locale as string)) notFound();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});