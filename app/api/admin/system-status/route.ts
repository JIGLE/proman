import { NextRequest } from "next/server";

import { handleOptions, requireAdmin } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getSystemStatus } from "@/lib/services/admin/system-status";

export const runtime = "nodejs";

/**
 * GET /api/admin/system-status — what is connected, what is simulated, what is broken.
 *
 * Admin-only, matching the other two routes under /api/admin. The payload names environment
 * variables by name and reports schema drift, which is operator information rather than
 * landlord information.
 *
 * `getSystemStatus` captures its own failures per check, so this handler stays thin: a
 * diagnostics endpoint that answers 500 is worthless at the one moment it is needed.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const status = await getSystemStatus(authResult.userId);
  return createSuccessResponse(status);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
