import { NextRequest } from "next/server";

import { handleOptions, requireAdmin } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getSignInStatus } from "@/lib/services/admin/sign-in-status";

export const runtime = "nodejs";

/**
 * GET /api/admin/sign-in-status — how anyone can get in, and whether registration is closed.
 *
 * Reports only. Provider configuration lives in the environment, deliberately: a runtime toggle
 * that disables the provider you are signed in with locks you out with no way back through the UI.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  return createSuccessResponse(await getSignInStatus());
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
