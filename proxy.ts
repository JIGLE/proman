/**
 * Proxy for Next.js 16+ locale routing, demo mode, and URL redirects
 * Handles:
 * - Locale prefix enforcement (always use /en, /pt, or /es)
 * - Demo mode: /demo entry redirect + route blocking for demo sessions
 * - Backward compatibility redirects from old tab-based URLs
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./lib/i18n/config";

/** Cookie name for demo mode (must match lib/demo/demo-mode.ts) */
const DEMO_COOKIE_NAME = "proman_demo";

/** Paths blocked during demo mode */
const DEMO_BLOCKED_PATTERNS = ["/api/user", "/api/debug"];

/**
 * Generate CSP nonce (Edge-compatible version)
 * Uses Web Crypto API available in Edge runtime
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse, nonce: string): void {
  const headers = response.headers;

  // Pass nonce to the app via custom header
  headers.set("x-nonce", nonce);

  // HSTS: Force HTTPS for 1 year (production only)
  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // X-Frame-Options: Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options: Prevent MIME sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection: Legacy XSS protection
  headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy: Control referrer information
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy: Disable unnecessary features
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

  // Content-Security-Policy with nonces (strict CSP)
  const isDev = process.env.NODE_ENV === "development";

  const cspDirectives = [
    "default-src 'self'",
    // Script sources - nonce-based for inline scripts, eval only in dev
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://apis.google.com${isDev ? " 'unsafe-eval'" : ""}`,
    // Style sources - unsafe-inline required for React DOM, Framer Motion, and CSS-in-JS libs
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://accounts.google.com https://api.stripe.com https://nominatim.openstreetmap.org${isDev ? " http://localhost:*" : ""}`,
    "frame-src 'self' https://accounts.google.com https://js.stripe.com",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    // Only upgrade insecure requests in production (avoids https://localhost errors in dev)
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  headers.set("Content-Security-Policy", cspDirectives);
}

export function proxy(request: NextRequest) {
  // Generate unique nonce for this request
  const nonce = generateNonce();

  const { pathname, searchParams } = request.nextUrl;

  // API and auth routes should NOT get locale redirects, but DO get security headers
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    const response = NextResponse.next();
    applySecurityHeaders(response, nonce);
    return response;
  }

  // ── Handle /demo entry point ────────────────────────
  // Redirect /demo → /[defaultLocale]/demo for locale routing
  if (pathname === "/demo") {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}/demo`;
    const response = NextResponse.redirect(url);
    applySecurityHeaders(response, nonce);
    return response;
  }

  // ── Legacy property payment path redirects ────────────────────────
  // Redirect old nested payment-review URLs to the canonical financials URL.
  const legacyPropertyPaymentMatch = pathname.match(
    /^\/(en|pt|es)\/(?:portfolio|properties)\/([^/]+)\/(?:payments?|payment-review|review-payments)(?:\/review)?\/?$/,
  );
  if (legacyPropertyPaymentMatch) {
    const [, locale, propertyId] = legacyPropertyPaymentMatch;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/financials`;
    url.searchParams.set("tab", "receipts");
    url.searchParams.set("propertyId", propertyId);
    const response = NextResponse.redirect(url, 301);
    applySecurityHeaders(response, nonce);
    return response;
  }

  // ── Demo mode route blocking ────────────────────────
  const cookieHeader = request.headers.get("cookie") || "";
  const isDemo = cookieHeader.includes(`${DEMO_COOKIE_NAME}=1`);
  if (isDemo) {
    // Strip locale prefix to check the actual route
    const pathWithoutLocale = pathname.replace(/^\/(pt|en|es)/, "") || "/";

    const isBlocked = DEMO_BLOCKED_PATTERNS.some(
      (pattern) => pathWithoutLocale === pattern || pathWithoutLocale.startsWith(pattern + "/"),
    );

    if (isBlocked) {
      // For API routes, return 403 JSON
      if (pathWithoutLocale.startsWith("/api/")) {
        const response = NextResponse.json(
          { error: "This feature is not available in demo mode" },
          { status: 403 },
        );
        applySecurityHeaders(response, nonce);
        return response;
      }
      // For page routes, redirect to dashboard
      const url = request.nextUrl.clone();
      const locale = pathname.split("/")[1] || defaultLocale;
      url.pathname = `/${locale}/dashboard`;
      const response = NextResponse.redirect(url);
      applySecurityHeaders(response, nonce);
      return response;
    }
  }

  const localeMatch = pathname.match(/^\/(en|pt|es)/);
  const locale = localeMatch ? localeMatch[1] : defaultLocale;

  // Preserve canonical financial tab routes used by the current UI.
  const isFinancialsPath = pathname === `/${locale}/financials` || pathname === "/financials";
  const canonicalFinancialTabs = new Set(["queue", "receipts", "rent-roll", "tax"]);

  // Handle old tab-based URL redirects (backward compatibility)
  const tab = searchParams.get("tab");
  if (tab) {
    // Keep canonical financial URLs untouched (e.g. /pt/financials?tab=receipts&propertyId=...)
    if (isFinancialsPath && canonicalFinancialTabs.has(tab)) {
      const response = NextResponse.next();
      applySecurityHeaders(response, nonce);
      return response;
    }

    // Map old tab names to new routes
    const tabRouteMap: Record<string, string | { path: string; financialTab?: string }> = {
      overview: "/dashboard",
      properties: "/portfolio",
      tenants: "/people",
      leases: "/leases",
      financials: "/financials",
      receipts: { path: "/financials", financialTab: "receipts" },
      expenses: { path: "/financials", financialTab: "queue" },
      invoices: { path: "/financials", financialTab: "receipts" },
      "payment-matrix": { path: "/financials", financialTab: "receipts" },
      maintenance: "/maintenance",
      owners: "/owners",
      correspondence: "/correspondence",
      reports: "/reports",
      analytics: "/analytics",
      settings: "/settings",
      profile: "/settings/profile",
      preferences: "/settings/preferences",
      admin: "/settings/admin",
    };

    const mapping = tabRouteMap[tab as keyof typeof tabRouteMap];
    if (mapping) {
      // Build new URL with locale prefix
      const url = request.nextUrl.clone();
      const path = typeof mapping === "string" ? mapping : mapping.path;
      url.pathname = `/${locale}${path}`;

      // Preserve other query params (like search, status, etc.)
      url.searchParams.delete("tab");
      url.searchParams.delete("subtab"); // Remove old subtab param too
      if (typeof mapping !== "string" && mapping.financialTab) {
        url.searchParams.set("tab", mapping.financialTab);
      }

      const response = NextResponse.redirect(url, 301); // Permanent redirect
      applySecurityHeaders(response, nonce);
      return response;
    }
  }

  // Handle old subtab-based URLs for financials
  const subtab = searchParams.get("subtab");
  if (subtab && pathname.includes("financials")) {
    const subtabRouteMap: Record<string, string> = {
      receipts: "receipts",
      expenses: "queue",
      invoices: "receipts",
      "payment-matrix": "receipts",
    };

    const financialTab = subtabRouteMap[subtab];
    if (financialTab) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/financials`;
      url.searchParams.delete("subtab");
      url.searchParams.set("tab", financialTab);
      const response = NextResponse.redirect(url, 301);
      applySecurityHeaders(response, nonce);
      return response;
    }
  }

  // Check if pathname already starts with a supported locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  let response: NextResponse;

  // If path has locale, let it through
  if (pathnameHasLocale) {
    response = NextResponse.next();
  } else if (pathname === "/") {
    // Detect preferred locale from Accept-Language header, fall back to defaultLocale
    const acceptLanguage = request.headers.get("accept-language") ?? "";
    const preferred = acceptLanguage
      .split(",")
      .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
      .find((lang) => (locales as readonly string[]).includes(lang));
    const detectedLocale = (preferred ?? defaultLocale) as typeof defaultLocale;
    response = NextResponse.redirect(new URL(`/${detectedLocale}`, request.url), { status: 307 });
  } else {
    // For any other path without locale, prepend default locale
    // This handles /path -> /en/path
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    response = NextResponse.redirect(url, { status: 307 });
  }

  // Apply security headers to all responses
  applySecurityHeaders(response, nonce);

  return response;
}

export const config = {
  // Match all pathnames except for:
  // - _next (Next.js internals)
  // - Static files (images, fonts, etc.)
  // NOTE: API and auth routes ARE included so they get security headers
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|version\.json|sw\.js|manifest\.webmanifest|offline\.html|.*\.(?:svg|png|jpg|jpeg|gif|webp|json|webmanifest|txt|woff2?)$).*)",
  ],
};
