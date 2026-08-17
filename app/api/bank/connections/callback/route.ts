import { NextRequest, NextResponse } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import { withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { completeConsent, ConsentFlowError } from "@/lib/services/bank/consent";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

/**
 * GET /api/bank/connections/callback?ref=… — where the bank sends the user back.
 *
 * This is a browser redirect, not an API call, so it answers with a redirect rather than JSON:
 * the person arriving here is looking at a page, and a JSON body would strand them on it.
 *
 * It carries the session cookie like any other navigation, which is what lets it be authenticated
 * at all. The guards that matter live in `completeConsent` — unguessable reference, must belong to
 * the signed-in user, single-use — and are tested there.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const settings = new URL("/settings?tab=integrations", request.nextUrl.origin);

  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const reference = request.nextUrl.searchParams.get("ref") ?? "";

  try {
    await completeConsent(scopeUserId, reference);
    settings.searchParams.set("bank", "connected");
  } catch (error) {
    // The reason is deliberately not put in the URL: these messages are the same for an unknown,
    // a replayed and a foreign reference precisely so the redirect cannot be used as an oracle.
    // The user sees "that did not complete"; the log carries the detail.
    settings.searchParams.set("bank", "failed");
    logger.warn("Bank consent callback did not complete", {
      error: error instanceof Error ? error.message : String(error),
      status: error instanceof ConsentFlowError ? error.status : 500,
    });
  }

  return NextResponse.redirect(settings);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
