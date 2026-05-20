import { NextIntlClientProvider } from "next-intl";
import { cookies, headers } from "next/headers";
import { locales, defaultLocale } from "@/lib/i18n/config";
import enMessages from "@/messages/en.json";
import ptMessages from "@/messages/pt.json";
import esMessages from "@/messages/es.json";

const messages = { en: enMessages, pt: ptMessages, es: esMessages } as const;

/**
 * Detects the best locale for the tenant portal by inspecting:
 * 1. A "NEXT_LOCALE" cookie set by the main app locale switcher
 * 2. The Accept-Language request header
 * 3. Falls back to the platform default locale
 */
async function detectLocale(): Promise<(typeof locales)[number]> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (localeCookie && (locales as readonly string[]).includes(localeCookie)) {
    return localeCookie as (typeof locales)[number];
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language") ?? "";
  for (const part of acceptLanguage.split(",")) {
    const lang = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if ((locales as readonly string[]).includes(lang)) {
      return lang as (typeof locales)[number];
    }
  }

  return defaultLocale;
}

export default async function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const locale = await detectLocale();
  const localeMessages = messages[locale];

  return (
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
