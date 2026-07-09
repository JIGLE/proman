import { NextRequest } from "next/server";
import { requireAuth, handleOptions } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { getActivationSummary } from "@/lib/services/analytics/activation-summary";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";

// GET /api/activation - The signed-in landlord's own activation timeline
// (first property/tenant/lease/paid-receipt) — see
// lib/services/analytics/activation-summary.ts.
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const prisma = getPrismaClient();
  const summary = await getActivationSummary(prisma, userId);

  return createSuccessResponse(summary);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
