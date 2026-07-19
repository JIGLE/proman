import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  parseBody,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { extractionReviewSchema } from "@/lib/schemas/document.schema";
import { classifyAndPersist, reviewExtraction } from "@/lib/services/ocr/service";
import { getPrismaClient } from "@/lib/services/database/database";

export const runtime = "nodejs";

async function extractId(context?: {
  params?: Record<string, string> | Promise<Record<string, string>>;
}): Promise<string | undefined> {
  if (!context?.params) return undefined;
  const resolved = context.params instanceof Promise ? await context.params : context.params;
  return resolved?.id;
}

// POST /api/documents/[id]/extraction — (re-)run mock classification.
async function handlePost(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const id = await extractId(context);
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  const prisma = getPrismaClient();
  const document = await prisma.document.findFirst({ where: { id, userId: scopeUserId } });
  if (!document) return createErrorResponse(new Error("Document not found"), 404, request);

  await classifyAndPersist(id);
  const extraction = await prisma.documentExtraction.findUnique({ where: { documentId: id } });
  return createSuccessResponse(extraction, 201);
}

// PUT /api/documents/[id]/extraction — accept or correct the Review Required proposal.
async function handlePut(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const id = await extractId(context);
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  const body = parseBody(await request.json(), extractionReviewSchema);

  try {
    await reviewExtraction(scopeUserId, id, {
      accept: body.accept,
      type: body.type,
      linkedEntityType: body.linkedEntityType ?? null,
      linkedEntityId: body.linkedEntityId ?? null,
    });
    return createSuccessResponse({ documentId: id });
  } catch (error) {
    return createErrorResponse(error as Error, 400, request);
  }
}

export const POST = withErrorHandler(withRateLimit(handlePost));
export const PUT = withErrorHandler(withRateLimit(handlePut));
export const OPTIONS = handleOptions;
