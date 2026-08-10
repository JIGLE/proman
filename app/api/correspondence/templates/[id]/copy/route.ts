import { NextRequest } from "next/server";
import { handleOptions, requireAuth } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { templateService } from "@/lib/services/database/correspondence";

/**
 * POST /api/correspondence/templates/[id]/copy
 *
 * Forks a template the caller can see into one they own. Deliberately a separate, explicit
 * endpoint rather than an implicit side effect of editing: copying a statutory instrument is the
 * moment responsibility for its wording moves from the product to the landlord, and a boundary
 * nobody crossed on purpose is not a boundary. The fork records `derivedFromId` and
 * `derivedFromVersion` so that transfer stays provable afterwards.
 */
async function handlePost(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  let id: string | undefined;
  if (context?.params) {
    const resolved = context.params instanceof Promise ? await context.params : context.params;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  // Throws ResourceNotFoundError (→ 404) for anything the caller cannot see.
  const copy = await templateService.copyForUser(authResult.userId, id);
  return createSuccessResponse(copy, 201);
}

export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
