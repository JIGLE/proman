/**
 * Billing Portal API
 * GET /api/billing/portal
 *
 * Browser-navigable: redirects the signed-in user into a Stripe-hosted
 * Billing Portal session so they can update payment methods, change plans,
 * or cancel their subscription.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { isDemoRequest } from "@/lib/demo/demo-mode";
import { createBillingPortalSession } from "@/lib/billing/subscription-service";
import { locales, defaultLocale } from "@/lib/i18n/config";

function getBaseUrl(request: NextRequest): string {
  return process.env.NEXTAUTH_URL || request.nextUrl.origin;
}

function detectLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }
  return defaultLocale;
}

export async function GET(request: NextRequest): Promise<Response> {
  if (isDemoRequest(request)) {
    const referer = request.headers.get("referer");
    return NextResponse.redirect(
      referer && referer.startsWith(getBaseUrl(request)) ? referer : "/",
    );
  }

  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const baseUrl = getBaseUrl(request);
  const locale = detectLocale(request);

  try {
    const url = await createBillingPortalSession(
      userId,
      `${baseUrl}/${locale}/settings?tab=billing`,
    );
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Billing portal error:", error);
    const message = error instanceof Error ? error.message : "Failed to open billing portal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
