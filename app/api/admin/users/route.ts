import { NextRequest } from "next/server";

import { handleOptions, requireAdmin } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { listUsers } from "@/lib/services/admin/users";

export const runtime = "nodejs";

/**
 * GET /api/admin/users — every account on this instance.
 *
 * The question `registration.ts` cannot answer. Closing registration stops new strangers; it does
 * nothing about anyone who signed in during the window when the OAuth callback admitted everybody
 * as an ADMIN, and there was previously no way to see them short of opening Prisma Studio against
 * the production database.
 *
 * Unpaginated on purpose: a self-hosted instance has single-digit accounts, and paging would add a
 * cursor to a list whose entire value is being complete at a glance.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const users = await listUsers(authResult.userId);
  return createSuccessResponse({ users });
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
