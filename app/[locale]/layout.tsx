import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { ClientProviders } from "@/components/client-providers";
import VersionBadge from '@/components/version-badge';
import { CurrencyProvider } from '@/lib/currency-context';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {locales} from '@/lib/i18n';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Proman - Property Management Dashboard",
  description: "Minimal property management dashboard",
};

export default async function Layout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}): Promise<React.ReactElement> {
  let {locale} = await params;
  // Ensure that the incoming `locale` is valid
  if (!locales.includes(locale as any)) {
    locale = 'en';
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}