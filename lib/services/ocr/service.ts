/**
 * Situs OCR service — Prisma orchestration around the pure mock classifier.
 * Runs at most once automatically per document (idempotent — an existing
 * extraction is left alone); re-classification is an explicit action.
 */

import { getPrismaClient } from "@/lib/services/database/database";
import { logAudit } from "@/lib/services/audit-log";
import { classifyDocument } from "./classifier";

/**
 * Classify a Document and persist (or refresh) its DocumentExtraction row.
 * Called best-effort right after upload — never blocks the upload itself.
 */
export async function classifyAndPersist(documentId: string): Promise<void> {
  const prisma = getPrismaClient();
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) return;

  const result = classifyDocument({
    name: document.name,
    mimeType: document.mimeType,
    description: document.description,
    existingPropertyId: document.propertyId,
    existingTenantId: document.tenantId,
    existingOwnerId: document.ownerId,
  });

  await prisma.documentExtraction.upsert({
    where: { documentId },
    create: {
      documentId,
      userId: document.userId,
      status: result.status,
      engine: "mock",
      confidence: result.confidence,
      extractedFields: JSON.stringify(result.extractedFields),
      suggestedType: result.suggestedType,
      linkedEntityType: result.linkedEntityType,
      linkedEntityId: result.linkedEntityId,
    },
    update: {
      status: result.status,
      confidence: result.confidence,
      extractedFields: JSON.stringify(result.extractedFields),
      suggestedType: result.suggestedType,
      linkedEntityType: result.linkedEntityType,
      linkedEntityId: result.linkedEntityId,
      reviewedAt: null,
    },
  });

  await logAudit({
    userId: document.userId,
    action: "OCR_CLASSIFY_DOCUMENT",
    resourceType: "document",
    resourceId: documentId,
    details: {
      suggestedType: result.suggestedType,
      confidence: result.confidence,
      status: result.status,
    },
  });
}

export interface ReviewDecision {
  accept: boolean;
  /** Overrides when the human corrects the proposal instead of accepting it. */
  type?: string;
  linkedEntityType?: "tenant" | "property" | "owner" | null;
  linkedEntityId?: string | null;
}

/**
 * Resolve a Review Required row: accept the proposal as-is, or apply a
 * human correction. Either way, applies the resulting type/link to the
 * Document itself and marks the extraction reviewed.
 */
export async function reviewExtraction(
  userId: string,
  documentId: string,
  decision: ReviewDecision,
): Promise<void> {
  const prisma = getPrismaClient();
  const extraction = await prisma.documentExtraction.findFirst({
    where: { documentId, userId },
  });
  if (!extraction) throw new Error("No extraction found for this document");

  const finalType = decision.accept ? extraction.suggestedType : decision.type;
  const finalEntityType = decision.accept
    ? extraction.linkedEntityType
    : (decision.linkedEntityType ?? null);
  const finalEntityId = decision.accept
    ? extraction.linkedEntityId
    : (decision.linkedEntityId ?? null);

  const documentUpdate: Record<string, unknown> = {};
  if (finalType) documentUpdate.type = finalType;
  if (finalEntityType === "tenant") documentUpdate.tenantId = finalEntityId;
  else if (finalEntityType === "property") documentUpdate.propertyId = finalEntityId;
  else if (finalEntityType === "owner") documentUpdate.ownerId = finalEntityId;

  await prisma.$transaction([
    prisma.document.update({ where: { id: documentId }, data: documentUpdate }),
    prisma.documentExtraction.update({
      where: { documentId },
      data: {
        status: "completed",
        suggestedType: finalType,
        linkedEntityType: finalEntityType,
        linkedEntityId: finalEntityId,
        reviewedAt: new Date(),
      },
    }),
  ]);

  await logAudit({
    userId,
    action: "OCR_EXTRACTION_REVIEWED",
    resourceType: "document",
    resourceId: documentId,
    details: { accepted: decision.accept, type: finalType, linkedEntityType: finalEntityType },
  });
}
