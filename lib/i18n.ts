import {createNavigation} from 'next-intl/navigation';
import {locales, defaultLocale} from '@/i18n';

export type Locale = (typeof locales)[number];

// Re-export for convenience
export {locales, defaultLocale};

export const {Link, redirect, usePathname, useRouter} = createNavigation({
  locales,
  defaultLocale,
});