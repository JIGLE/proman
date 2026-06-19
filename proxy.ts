/**
 * Proxy for Next.js 16+ locale routing, auth enforcement, CSRF, demo mode, and URL redirects.
 * Handles:
 * - Auth guard: 401 for unauthenticated protected API requests; redirect portal pages to sign-in
 * - CSRF validation for state-changing API requests
 * - Locale prefix enforcement (always use /en, /pt, /es, or /it)
 * - Demo mode: /demo entry redirect + route blocking for demo sessions
 * - Backward compatibility redirects from old tab-based URLs
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./lib/i18n/config";
import {
  verifyCsrfToken,
  requiresCsrfProtection,
  getOrGenerateCsrfToken,
  setCsrfCookie,
} from "@/lib/middleware/csrf";

// next-auth/jwt typings reference next's GetServerSidePropsContext which may not resolve
// under moduleResolution:bundler — import at the value level only to avoid the tsc error.
const { getToken } = require("next-auth/jwt") as {
  getToken: (params: {
    req: NextRequest;
    secret?: string;
  }) => Promise<Record<string, unknown> | null>;
};

/** Cookie name for demo mode (must match lib/demo/demo-mode.ts) */
const DEMO_COOKIE_NAME = "proman_demo";

/** Paths blocked during demo mode */
const DEMO_BLOCKED_PATTERNS = ["/api/user", "/api/debug"];

// Locales supported by the app (keep in sync with lib/i18n/config.ts)
const SUPPORTED_LOCALES = ["pt", "en", "es", "it"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(segment: string): segment is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(segment);
}

/**
 * Public API prefixes — these routes must never require a session.
 * /api/auth/**           — NextAuth sign-in / callback endpoints
 * /api/health            — Liveness/readiness probe
 * /api/tenant-portal/**  — Token-based tenant self-service API
 * /api/csrf-token        — CSRF token endpoint (GET only, no auth needed)
 * /api/monitoring/**     — Health/metrics probes
 */
function isPublicApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname === "/api/ready" ||
    pathname === "/api/info" ||
    pathname.startsWith("/api/tenant-portal") ||
    pathname === "/api/csrf-token" ||
    pathname.startsWith("/api/monitoring")
  );
}

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

export async function proxy(request: NextRequest) {
  // Generate unique nonce for this request
  const nonce = generateNonce();

  const { pathname, searchParams } = request.nextUrl;

  // ── API routes ────────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    // Public routes — pass through without auth or CSRF checks
    if (isPublicApiRoute(pathname)) {
      const response = NextResponse.next();
      applySecurityHeaders(response, nonce);
      return response;
    }

    // Auth check for protected API routes
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      applySecurityHeaders(response, nonce);
      return response;
    }

    // CSRF check for state-changing requests
    if (requiresCsrfProtection(request.method)) {
      if (!verifyCsrfToken(request)) {
        const response = NextResponse.json(
          {
            error: "Invalid CSRF token",
            message: "CSRF token missing or invalid. Please refresh and try again.",
          },
          { status: 403 },
        );
        applySecurityHeaders(response, nonce);
        return response;
      }
    }

    const response = NextResponse.next();
    applySecurityHeaders(response, nonce);
    return response;
  }

  // ── Handle /demo entry point ────────────────────────────────────────
  if (pathname === "/demo") {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}/demo`;
    const response = NextResponse.redirect(url);
    applySecurityHeaders(response, nonce);
    return response;
  }

  // ── Legacy property payment path redirects ──────────────────────────
  const legacyPropertyPaymentMatch = pathname.match(
    /^\/(en|pt|es|it)\/(?:portfolio|properties)\/([^/]+)\/(?:payments?|payment-review|review-payments)(?:\/review)?\/?$/,
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

  // ── Demo mode route blocking ────────────────────────────────────────
  const cookieHeader = request.headers.get("cookie") || "";
  const isDemo = cookieHeader.includes(`${DEMO_COOKIE_NAME}=1`);
  if (isDemo) {
    const pathWithoutLocale = pathname.replace(/^\/(pt|en|es|it)/, "") || "/";

    const isBlocked = DEMO_BLOCKED_PATTERNS.some(
      (pattern) => pathWithoutLocale === pattern || pathWithoutLocale.startsWith(pattern + "/"),
    );

    if (isBlocked) {
      if (pathWithoutLocale.startsWith("/api/")) {
        const response = NextResponse.json(
          { error: "This feature is not available in demo mode" },
          { status: 403 },
        );
        applySecurityHeaders(response, nonce);
        return response;
      }
      const url = request.nextUrl.clone();
      const locale = pathname.split("/")[1] || defaultLocale;
      url.pathname = `/${locale}/dashboard`;
      const response = NextResponse.redirect(url);
      applySecurityHeaders(response, nonce);
      return response;
    }
  }

  const localeMatch = pathname.match(/^\/(en|pt|es|it)/);
  const locale = localeMatch ? localeMatch[1] : defaultLocale;

  // ── Portal page auth guard ──────────────────────────────────────────
  const segments = pathname.split("/");
  const localeSegment = segments[1] ?? "";
  const rest = segments.slice(2).join("/");

  if (isSupportedLocale(localeSegment)) {
    const isMainPortalPage =
      rest.startsWith("dashboard") ||
      rest.startsWith("properties") ||
      rest.startsWith("portfolio") ||
      rest.startsWith("tenants") ||
      rest.startsWith("people") ||
      rest.startsWith("leases") ||
      rest.startsWith("buildings") ||
      rest.startsWith("units") ||
      rest.startsWith("contacts") ||
      rest.startsWith("contracts") ||
      rest.startsWith("correspondence") ||
      rest.startsWith("financials") ||
      rest.startsWith("maintenance") ||
      rest.startsWith("reports") ||
      rest.startsWith("analytics") ||
      rest.startsWith("insights") ||
      rest.startsWith("overview") ||
      rest.startsWith("documents") ||
      rest.startsWith("owners") ||
      rest.startsWith("settings");

    if (isMainPortalPage) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        const signInUrl = request.nextUrl.clone();
        signInUrl.pathname = `/${localeSegment}/auth/signin`;
        signInUrl.searchParams.set("callbackUrl", pathname);
        const response = NextResponse.redirect(signInUrl);
        applySecurityHeaders(response, nonce);
        return response;
      }

      // Seed CSRF cookie for portal pages (needed by the API client)
      const response = NextResponse.next();
      applySecurityHeaders(response, nonce);
      const existingCsrfToken = request.cookies.get("csrf-token")?.value;
      if (!existingCsrfToken) {
        const csrfToken = getOrGenerateCsrfToken(request);
        setCsrfCookie(response, csrfToken);
      }
      return response;
    }
  }

  // Preserve canonical financial tab routes used by the current UI.
  const isFinancialsPath = pathname === `/${locale}/financials` || pathname === "/financials";
  const canonicalFinancialTabs = new Set(["queue", "receipts", "rent-roll", "tax"]);

  // Handle old tab-based URL redirects (backward compatibility)
  const tab = searchParams.get("tab");
  if (tab) {
    if (isFinancialsPath && canonicalFinancialTabs.has(tab)) {
      const response = NextResponse.next();
      applySecurityHeaders(response, nonce);
      return response;
    }

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
      const url = request.nextUrl.clone();
      const path = typeof mapping === "string" ? mapping : mapping.path;
      url.pathname = `/${locale}${path}`;
      url.searchParams.delete("tab");
      url.searchParams.delete("subtab");
      if (typeof mapping !== "string" && mapping.financialTab) {
        url.searchParams.set("tab", mapping.financialTab);
      }
      const response = NextResponse.redirect(url, 301);
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

  if (pathnameHasLocale) {
    response = NextResponse.next();
  } else if (pathname === "/") {
    const acceptLanguage = request.headers.get("accept-language") ?? "";
    const preferred = acceptLanguage
      .split(",")
      .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
      .find((lang) => (locales as readonly string[]).includes(lang));
    const detectedLocale = (preferred ?? defaultLocale) as typeof defaultLocale;
    response = NextResponse.redirect(new URL(`/${detectedLocale}`, request.url), { status: 307 });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    response = NextResponse.redirect(url, { status: 307 });
  }

  applySecurityHeaders(response, nonce);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|version\\.json|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|webmanifest|txt|woff2?)$).*)",
  ],
};
