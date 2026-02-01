/**
 * Next-intl navigation helpers
 * Provides type-safe navigation with locale support
 */

import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { locales } from './config';

export const { Link, redirect, usePathname, useRouter } = 
  createSharedPathnamesNavigation({ locales });
