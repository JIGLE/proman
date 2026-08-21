import { NextRequest } from "next/server";

import { handleOptions, requireAdmin } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { listTestConnections } from "@/lib/services/bank/test-connections";

export const runtime = "nodejs";

/**
 * GET /api/admin/bank-test-connections — the connections made to prove the chain works.
 *
 * Separate from `GET /api/bank/connections`, which is the Settings hub's list of connections you
 * actually rely on. Keeping test runs out of that list is the point: a sandbox trial should not
 * sit among real banks looking like one.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  return createSuccessResponse({
    connections: await listTestConnections(authResult.userId),
  });
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
