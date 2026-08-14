import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import {
  syncConnection,
  SyncBudgetExceededError,
  ConnectionNotSyncableError,
} from "@/lib/services/bank/sync";
import { ConsentExpiredError } from "@/lib/services/bank/providers/types";

export const runtime = "nodejs";

// POST /api/bank/connections/[id]/sync — pull new movements for one connection now.
async function handlePost(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const resolved = context?.params
    ? context.params instanceof Promise
      ? await context.params
      : context.params
    : undefined;
  const id = resolved?.id;
  if (!id) {
    return createErrorResponse(new Error("Connection id is required"), 400, request);
  }

  try {
    const result = await syncConnection(scopeUserId, id);
    return createSuccessResponse(result);
  } catch (error) {
    // Each of these is a different thing for the user to do, so each gets its own status rather
    // than collapsing into a 500 that says "try again" to someone who cannot.
    if (error instanceof SyncBudgetExceededError) {
      return createErrorResponse(error, 429, request);
    }
    if (error instanceof ConsentExpiredError) {
      return createErrorResponse(error, 409, request);
    }
    if (error instanceof ConnectionNotSyncableError) {
      return createErrorResponse(error, 404, request);
    }
    throw error;
  }
}

export const POST = withErrorHandler(withRateLimit(handlePost));
export const OPTIONS = handleOptions;
