import { ClientProviders } from "@/components/shared/client-providers";
import DevDebug from '@/components/shared/dev-debug';
import VersionBadge from '@/components/shared/version-badge';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {locales, defaultLocale} from '@/lib/i18n/config';

// Generate static params for all supported locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Layout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}): Promise<React.ReactElement> {
  const {locale: requestedLocale} = await params;
  
  // Validate locale and fallback to default
  const locale = hasLocale(locales, requestedLocale) ? requestedLocale : defaultLocale;
  
  // Enable static rendering for this locale
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <CurrencyProvider initialLocale={locale}>
        <ClientProviders>
          {children}
          {process.env.NODE_ENV === 'development' && <DevDebug />}
          <div style={{position: 'fixed', right: 12, bottom: 8}}>
            <VersionBadge />
          </div>
        </ClientProviders>
      </CurrencyProvider>
    </NextIntlClientProvider>
  );
}