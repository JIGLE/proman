import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getPrismaClient } from "@/lib/services/database/database";

export const runtime = "nodejs";

const MAX_RESOURCE_IDS = 500;

/**
 * Situs generalized audit trail read model — powers the AuditTrail component
 * wherever it's mounted (property Audit tab, Account page). Without
 * `resourceIds`, returns the account-wide trail (account scope); with it,
 * scopes to exactly those records (entity scope) — same shape either way.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const url = new URL(request.url);
  const resourceIdsParam = url.searchParams.get("resourceIds");

  // Distinguish "no filter" (account-wide) from "filter present but empty"
  // (nothing to show) — an empty scoped query must never fall through to
  // the account-wide trail.
  if (resourceIdsParam !== null) {
    const resourceIds = resourceIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_RESOURCE_IDS);
    if (resourceIds.length === 0) return createSuccessResponse([]);

    const prisma = getPrismaClient();
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: scopeUserId, resourceId: { in: resourceIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, resourceType: true, resourceId: true, createdAt: true },
    });
    return createSuccessResponse(auditLogs);
  }

  const prisma = getPrismaClient();
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: scopeUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, resourceType: true, resourceId: true, createdAt: true },
  });

  return createSuccessResponse(auditLogs);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
