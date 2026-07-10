import { NextRequest } from "next/server";
import { requireAdmin, handleOptions } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { getCoreLoopMetrics } from "@/lib/services/analytics/activation-summary";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";

// GET /api/admin/core-loop-metrics - Minimal internal view of the North-Star
// inputs (docs/PRODUCT_AUDIT_2026.md §8): active/activated landlord counts,
// receipts paid, PT rent receipts issued, and reminder-click engagement,
// each over the trailing 30 days. Admin-only; not a public/tenant-facing
// endpoint. See lib/services/analytics/activation-summary.ts for the query.
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const prisma = getPrismaClient();
  const metrics = await getCoreLoopMetrics(prisma);

  return createSuccessResponse(metrics);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
