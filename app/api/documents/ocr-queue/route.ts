import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getPrismaClient } from "@/lib/services/database/database";

export const runtime = "nodejs";

const QUEUE_STATUSES = ["pending", "processing", "completed", "failed", "review_required"] as const;

// GET /api/documents/ocr-queue?status=review_required — the OCR/Inbox surfaces.
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = QUEUE_STATUSES.find((s) => s === statusParam);

  const prisma = getPrismaClient();
  const extractions = await prisma.documentExtraction.findMany({
    where: { userId: scopeUserId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      documentId: true,
      status: true,
      engine: true,
      confidence: true,
      suggestedType: true,
      linkedEntityType: true,
      linkedEntityId: true,
      reviewedAt: true,
      createdAt: true,
      document: { select: { name: true, mimeType: true, type: true, createdAt: true } },
    },
  });

  return createSuccessResponse(extractions);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
