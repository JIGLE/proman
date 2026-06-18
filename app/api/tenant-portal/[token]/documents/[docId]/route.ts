/**
 * Tenant Portal — Document Download
 * GET /api/tenant-portal/[token]/documents/[docId] — download a specific document
 */

import { NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/services/database/database";
import { createErrorResponse, ValidationError } from "@/lib/utils/error-handling";
import { verifyPortalToken } from "@/lib/services/auth/tenant-portal-auth";
import { documentService } from "@/lib/services/document-service";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\r\n\t]/g, "")
    .replace(/["\\]/g, "")
    .replace(/[^a-zA-Z0-9._()\- ]/g, "_")
    .trim()
    .slice(0, 180) || "document";
}

interface RouteParams {
  params: Promise<{ token: string; docId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { token, docId } = await params;

  const tokenData = await verifyPortalToken(token);
  if (!tokenData) {
    return createErrorResponse(new Error("Invalid or expired token"), 401, request);
  }

  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tokenData.tenantId },
    select: { id: true },
  });
  if (!tenant) {
    return createErrorResponse(new ValidationError("Tenant not found"), 404, request);
  }

  // Verify document belongs to this tenant
  const doc = await prisma.document.findFirst({
    where: { id: docId, tenantId: tenant.id },
    select: { id: true, name: true, mimeType: true },
  });
  if (!doc) {
    return createErrorResponse(new ValidationError("Document not found"), 404, request);
  }

  const file = await documentService.getFileContent(tokenData.userId, docId);
  if (!file) {
    return createErrorResponse(new Error("File content unavailable"), 404, request);
  }

  const safeFileName = sanitizeFilename(file.fileName);
  const encodedFileName = encodeURIComponent(safeFileName);

  return new Response(new Uint8Array(file.content), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": file.content.length.toString(),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
