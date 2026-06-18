/**
 * Tenant Portal — Documents
 * GET /api/tenant-portal/[token]/documents — list documents shared with this tenant
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/services/database/database";
import {
  createSuccessResponse,
  createErrorResponse,
  ValidationError,
} from "@/lib/utils/error-handling";
import { verifyPortalToken } from "@/lib/services/auth/tenant-portal-auth";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response | NextResponse> {
  const { token } = await params;
  const tokenData = await verifyPortalToken(token);
  if (!tokenData) {
    return createErrorResponse(new Error("Invalid or expired token"), 401, request);
  }

  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tokenData.tenantId },
    select: { id: true, propertyId: true },
  });
  if (!tenant) return createErrorResponse(new ValidationError("Tenant not found"), 404, request);

  const documents = await prisma.document.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return createSuccessResponse(
    documents.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      type: d.type,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      createdAt: d.createdAt.toISOString(),
      expiresAt: d.expiresAt?.toISOString(),
    })),
  );
}
