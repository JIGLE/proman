import { NextRequest } from "next/server";

import { handleOptions, requireAdmin } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { deleteUser } from "@/lib/services/admin/users";
import { logAudit } from "@/lib/services/audit-log";

export const runtime = "nodejs";

/** What each refusal means, in words the operator can act on. */
const REFUSAL_MESSAGE: Record<string, string> = {
  self: "You cannot delete your own account from here.",
  last_admin: "This is the only administrator. Promote another account first.",
  not_found: "No such account.",
};

/**
 * DELETE /api/admin/users/[id] — revoke an account.
 *
 * This is how a stranger admitted during the open-registration window is actually removed;
 * `registration.ts` only stops new ones. It is also the single most destructive button in the
 * product: `User` cascades to properties, tenants, leases, receipts and allocations, so deleting
 * the wrong row destroys a portfolio with no undo.
 *
 * The guards live in `refuseDeletion` (pure, enumerable) rather than here. Two of them exist
 * because the obvious implementation locks the operator out of their own instance — deleting
 * yourself, or deleting the last remaining administrator.
 *
 * Refusals answer 400 with a specific message rather than 403: the caller IS authorised, the
 * request is the problem, and "Forbidden" would send someone hunting for a permission that is not
 * missing.
 */
async function handleDelete(
  request: NextRequest,
  context?: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  // `withErrorHandler` types the context as optional, so the id is read defensively rather than
  // asserted — a route reached without params should 404, not throw.
  const id = (await context?.params)?.id;
  if (!id) return createErrorResponse(new Error("No such account."), 404, request);
  const result = await deleteUser(authResult.userId, id);

  if (!result.deleted) {
    return createErrorResponse(
      new Error(REFUSAL_MESSAGE[result.refusal] ?? "That account cannot be deleted."),
      result.refusal === "not_found" ? 404 : 400,
      request,
    );
  }

  // Recorded against the ADMIN who did it, not the account that vanished — its audit rows go with
  // it. Without this the most destructive action in the product would leave no trace at all.
  await logAudit({
    userId: authResult.userId,
    action: "DELETE_PERSONAL_DATA",
    resourceType: "User",
    resourceId: id,
    details: { reason: "admin removed an account" },
  });

  return createSuccessResponse({ deleted: true });
}

export const DELETE = withErrorHandler(withRateLimit(handleDelete));
export const OPTIONS = handleOptions;
