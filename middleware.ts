/**
 * Next.js root middleware
 *
 * Responsibilities:
 * 1. Auth guard — redirect unauthenticated users away from portal pages
 * 2. API auth guard — return 401 for protected API routes without a session
 * 3. CSRF validation — reject state-changing API requests that lack a valid CSRF token
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// next-auth/jwt typings reference next's GetServerSidePropsContext which may not resolve
// under moduleResolution:bundler — import at the value level only to avoid the tsc error.
const { getToken } = require("next-auth/jwt") as {
  getToken: (params: {
    req: NextRequest;
    secret?: string;
  }) => Promise<Record<string, unknown> | null>;
};
import {
  verifyCsrfToken,
  requiresCsrfProtection,
  getOrGenerateCsrfToken,
  setCsrfCookie,
} from "@/lib/middleware/csrf";

// Locales supported by the app (keep in sync with lib/i18n/config.ts)
const SUPPORTED_LOCALES = ["pt", "en", "es"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(segment: string): segment is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(segment);
}

/**
 * Public API prefixes — these routes must never require a session.
 * /api/auth/**        — NextAuth sign-in / callback endpoints
 * /api/health         — Liveness/readiness probe
 * /api/tenant-portal/**  — Token-based tenant self-service API
 * /api/csrf-token     — CSRF token endpoint (GET only, no auth needed)
 */
function isPublicApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/tenant-portal") ||
    pathname === "/api/csrf-token"
  );
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // ----------------------------------------------------------------
  // API routes
  // ----------------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    // Public routes — pass through without any checks
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }

    // Auth check for protected API routes
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CSRF check for state-changing requests
    if (requiresCsrfProtection(req.method)) {
      if (!verifyCsrfToken(req)) {
        return NextResponse.json(
          {
            error: "Invalid CSRF token",
            message: "CSRF token missing or invalid. Please refresh and try again.",
          },
          { status: 403 },
        );
      }
    }

    return NextResponse.next();
  }

  // ----------------------------------------------------------------
  // Portal page routes  (locale-prefixed, under /(main) route group)
  // ----------------------------------------------------------------
  const segments = pathname.split("/");
  // segments[0] is always "" for absolute paths
  const localeSegment = segments[1] ?? "";
  const rest = segments.slice(2).join("/");

  if (isSupportedLocale(localeSegment)) {
    // Paths that live under the (main) route group and require auth
    const isMainPortalPage =
      rest.startsWith("dashboard") ||
      rest.startsWith("properties") ||
      rest.startsWith("tenants") ||
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
      rest.startsWith("documents") ||
      rest.startsWith("owners") ||
      rest.startsWith("people") ||
      rest.startsWith("portfolio") ||
      rest.startsWith("overview") ||
      rest.startsWith("settings");

    if (isMainPortalPage) {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        const signInUrl = req.nextUrl.clone();
        signInUrl.pathname = `/${localeSegment}/auth/signin`;
        signInUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(signInUrl);
      }

      // Ensure a CSRF cookie is present for portal pages (needed by the API client)
      const response = NextResponse.next();
      const existingToken = req.cookies.get("csrf-token")?.value;
      if (!existingToken) {
        const csrfToken = getOrGenerateCsrfToken(req);
        setCsrfCookie(response, csrfToken);
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - Common static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
