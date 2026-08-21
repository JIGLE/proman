import { NextRequest } from "next/server";

import { handleOptions, requireAdmin } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { deleteTestConnection, TestConnectionError } from "@/lib/services/bank/test-connections";

export const runtime = "nodejs";

/**
 * DELETE /api/admin/bank-test-connections/{id} — throw away a test run.
 *
 * Refuses anything that is not marked as a test. A real connection carries every movement ever
 * imported through it, and a diagnostics panel is not where that decision belongs.
 *
 * The response says what was removed rather than answering a bare "ok": the caller renders it,
 * and "deleted 1 account and 34 movements" is the only form in which the operator can tell
 * whether the thing they meant to discard is the thing that went.
 */
async function handleDelete(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  // Same shape as the other `[id]` routes in this tree: `withRateLimit` types the context as
  // optional, and Next may hand params over as a promise or already resolved.
  const resolved = context?.params
    ? context.params instanceof Promise
      ? await context.params
      : context.params
    : {};
  const id = resolved.id;
  if (!id) {
    return createErrorResponse(new Error("Connection id is required"), 400, request);
  }

  try {
    const removed = await deleteTestConnection(authResult.userId, id);
    return createSuccessResponse({ removed });
  } catch (error) {
    if (error instanceof TestConnectionError) {
      return createErrorResponse(error, error.status, request);
    }
    throw error;
  }
}

export const DELETE = withErrorHandler(withRateLimit(handleDelete));
export const OPTIONS = handleOptions;
