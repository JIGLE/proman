import {createNavigation} from 'next-intl/navigation';

export const locales = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv'] as const;
export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'en';

export const {Link, redirect, usePathname, useRouter} = createNavigation({
  locales,
});