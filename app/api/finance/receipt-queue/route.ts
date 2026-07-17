import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getPrismaClient } from "@/lib/services/database/database";

export const runtime = "nodejs";

const REVIEW_LIFECYCLES = ["draft", "review", "rejected"] as const;

/**
 * Situs ReceiptAutomationQueue read model: receipts still moving through the
 * document lifecycle (drafts awaiting review/emission, or anything the AT
 * bounced back) plus the ones already further along, joined against their
 * originating bank movement (match confidence) and PT filing (tax status).
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope"); // "review" | null (all automation + non-emitted)

  const prisma = getPrismaClient();
  const receipts = await prisma.receipt.findMany({
    where: {
      userId: scopeUserId,
      type: "rent",
      ...(scope === "review"
        ? { lifecycle: { in: [...REVIEW_LIFECYCLES] } }
        : { OR: [{ source: "automation" }, { lifecycle: { not: "emitted" } }] }),
    },
    orderBy: { date: "desc" },
    take: 200,
    select: {
      id: true,
      amount: true,
      date: true,
      referenceMonth: true,
      lifecycle: true,
      source: true,
      tenant: { select: { name: true } },
      property: { select: { name: true } },
      bankTransactions: {
        select: { matchConfidence: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      rentReceiptFilings: {
        select: { id: true, status: true, receiptNumber: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return createSuccessResponse(
    receipts.map((r) => ({
      id: r.id,
      amount: r.amount,
      date: r.date,
      referenceMonth: r.referenceMonth,
      lifecycle: r.lifecycle,
      source: r.source,
      tenantName: r.tenant.name,
      propertyName: r.property.name,
      matchConfidence: r.bankTransactions[0]?.matchConfidence ?? null,
      taxFiling: r.rentReceiptFilings[0]
        ? { id: r.rentReceiptFilings[0].id, status: r.rentReceiptFilings[0].status }
        : null,
    })),
  );
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
