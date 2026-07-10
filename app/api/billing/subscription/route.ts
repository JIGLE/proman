/**
 * Billing Subscription API
 * GET /api/billing/subscription - the signed-in user's plan, status, and property usage
 */
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { isDemoRequest } from "@/lib/demo/demo-mode";
import { getCurrentPlanInfo } from "@/lib/billing/subscription-service";

async function handleGet(request: NextRequest): Promise<Response> {
  if (isDemoRequest(request)) {
    return createSuccessResponse({
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      maxProperties: 1,
      propertyCount: 1,
    });
  }

  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const prisma = getPrismaClient();
  const info = await getCurrentPlanInfo(prisma, userId);

  return createSuccessResponse(info);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
