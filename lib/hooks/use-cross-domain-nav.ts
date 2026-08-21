"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { locales } from "@/lib/i18n/config";

/**
 * Cross-Domain Navigation Hook
 *
 * Implements navigation rules from the UI/UX plan:
 * - Context preservation via returnTo parameter
 * - Proper back navigation to origin
 * - Cross-section linking with context
 *
 * Usage:
 * ```tsx
 * const nav = useCrossDomainNav();
 *
 * // Navigate to tenant profile from property page
 * nav.navigateWithContext("/people/tenant-123", "/assets/property-456");
 *
 * // In tenant profile, go back to property
 * nav.goBack("/people"); // Falls back to /people if no returnTo
 * ```
 */

export interface CrossDomainNavOptions {
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** Scroll to top after navigation */
  scroll?: boolean;
}

export interface CrossDomainNavResult {
  /** Current return-to URL from search params */
  returnTo: string | null;

  /** Current pathname */
  currentPath: string;

  /** Navigate to a URL while preserving origin context */
  navigateWithContext: (href: string, originPath?: string, options?: CrossDomainNavOptions) => void;

  /** Go back to origin or fallback */
  goBack: (fallback: string) => void;

  /** Build a URL with returnTo parameter */
  buildContextUrl: (href: string, originPath?: string) => string;

  /** Check if we came from a specific section */
  cameFrom: (section: string) => boolean;

  /** Get the origin section name (e.g., "assets", "people") */
  originSection: string | null;
}

/**
 * Strip a leading locale segment if there is one. `/^\/[a-z]{2}/` used to do this, which was
 * only ever safe while every URL carried a prefix — unprefixed, it eats the first two letters
 * of the section itself (`/people` -> `ople`). Match the segment, not its shape.
 */
function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(?=\/|$)/);
  return match && (locales as readonly string[]).includes(match[1])
    ? pathname.slice(match[0].length) || "/"
    : pathname;
}

export function useCrossDomainNav(): CrossDomainNavResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const returnTo = searchParams.get("returnTo");

  const originSection = useMemo(() => {
    if (!returnTo) return null;
    // Extract the section from a returnTo URL ("/assets/123" -> "assets"). URLs carry no locale
    // segment, but a stored one may still, so strip a leading locale before taking the first
    // segment rather than assuming its position either way.
    const [section] = stripLocale(returnTo).split("?")[0].split("/").filter(Boolean);
    return section ?? null;
  }, [returnTo]);

  const buildContextUrl = useCallback(
    (href: string, originPath?: string): string => {
      const origin = originPath || pathname;
      const separator = href.includes("?") ? "&" : "?";
      return `${href}${separator}returnTo=${encodeURIComponent(origin)}`;
    },
    [pathname],
  );

  const navigateWithContext = useCallback(
    (href: string, originPath?: string, options?: CrossDomainNavOptions) => {
      const url = buildContextUrl(href, originPath);

      if (options?.replace) {
        router.replace(url, { scroll: options?.scroll ?? true });
      } else {
        router.push(url, { scroll: options?.scroll ?? true });
      }
    },
    [router, buildContextUrl],
  );

  const goBack = useCallback(
    (fallback: string) => {
      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push(fallback);
      }
    },
    [router, returnTo],
  );

  const cameFrom = useCallback(
    (section: string): boolean => {
      return originSection === section;
    },
    [originSection],
  );

  return {
    returnTo,
    currentPath: pathname,
    navigateWithContext,
    goBack,
    buildContextUrl,
    cameFrom,
    originSection,
  };
}

/**
 * Section Routes Configuration
 * Defines canonical routes for each top-level section
 */
export const SECTION_ROUTES = {
  home: "/dashboard",
  assets: "/portfolio",
  people: "/people",
  maintenance: "/operations",
  correspondence: "/correspondence",
  finance: "/financials",
  insights: "/intelligence",
  settings: "/settings",
} as const;

export type Section = keyof typeof SECTION_ROUTES;

/**
 * Get the section from a pathname
 */
export function getSectionFromPath(pathname: string): Section | null {
  const pathWithoutLocale = stripLocale(pathname);

  for (const [section, route] of Object.entries(SECTION_ROUTES)) {
    if (pathWithoutLocale.startsWith(route)) {
      return section as Section;
    }
  }

  return null;
}

/**
 * Build a navigation path with locale
 */
export function buildLocalePath(locale: string, path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath;
}

export default useCrossDomainNav;
