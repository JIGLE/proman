import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getPrismaClient } from "@/lib/services/database/database";

export const runtime = "nodejs";

/**
 * Read-only bank connection status for the Settings > Integrations hub.
 * Mirrors GET /api/tax/connectors' shape/style. BankConnection rows are
 * find-or-created by the CSV import pipeline (lib/services/bank/import.ts)
 * -- there is no dedicated "connect a bank" write flow yet, so this route
 * is read-only by construction, not by omission.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const prisma = getPrismaClient();
  const connections = await prisma.bankConnection.findMany({
    where: { userId: scopeUserId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      provider: true,
      institutionName: true,
      status: true,
      lastSyncAt: true,
    },
  });

  return createSuccessResponse({ connections });
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
