import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { ClientProviders } from "@/components/client-providers";
import VersionBadge from '@/components/version-badge';
import { CurrencyProvider } from '@/lib/contexts/currency-context';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {locales, defaultLocale} from '@/lib/i18n/config';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Proman - Property Management Dashboard",
  description: "Minimal property management dashboard",
};

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
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CurrencyProvider initialLocale={locale}>
            <ClientProviders>
              {children}
              <VersionBadge />
            </ClientProviders>
          </CurrencyProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}