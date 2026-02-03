"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

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
  navigateWithContext: (
    href: string, 
    originPath?: string, 
    options?: CrossDomainNavOptions
  ) => void;
  
  /** Go back to origin or fallback */
  goBack: (fallback: string) => void;
  
  /** Build a URL with returnTo parameter */
  buildContextUrl: (href: string, originPath?: string) => string;
  
  /** Check if we came from a specific section */
  cameFrom: (section: string) => boolean;
  
  /** Get the origin section name (e.g., "assets", "people") */
  originSection: string | null;
}

export function useCrossDomainNav(): CrossDomainNavResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const returnTo = searchParams.get("returnTo");
  
  const originSection = useMemo(() => {
    if (!returnTo) return null;
    // Extract section from returnTo URL (e.g., "/en/assets/123" -> "assets")
    const match = returnTo.match(/\/[a-z]{2}\/([\w-]+)/);
    return match ? match[1] : null;
  }, [returnTo]);
  
  const buildContextUrl = useCallback((
    href: string, 
    originPath?: string
  ): string => {
    const origin = originPath || pathname;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}returnTo=${encodeURIComponent(origin)}`;
  }, [pathname]);
  
  const navigateWithContext = useCallback((
    href: string,
    originPath?: string,
    options?: CrossDomainNavOptions
  ) => {
    const url = buildContextUrl(href, originPath);
    
    if (options?.replace) {
      router.replace(url, { scroll: options?.scroll ?? true });
    } else {
      router.push(url, { scroll: options?.scroll ?? true });
    }
  }, [router, buildContextUrl]);
  
  const goBack = useCallback((fallback: string) => {
    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push(fallback);
    }
  }, [router, returnTo]);
  
  const cameFrom = useCallback((section: string): boolean => {
    return originSection === section;
  }, [originSection]);
  
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
  home: "/overview",
  assets: "/properties",
  people: "/tenants",
  maintenance: "/maintenance",
  correspondence: "/correspondence",
  finance: "/financials",
  insights: "/analytics",
  settings: "/settings",
} as const;

export type Section = keyof typeof SECTION_ROUTES;

/**
 * Get the section from a pathname
 */
export function getSectionFromPath(pathname: string): Section | null {
  // Remove locale prefix (e.g., /en/properties -> /properties)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "");
  
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
  return `/${locale}${normalizedPath}`;
}

export default useCrossDomainNav;
