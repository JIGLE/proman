/**
 * Tenant Portal — Profile
 * PATCH /api/tenant-portal/[token]/profile — update tenant contact details
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
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

const patchSchema = z.object({
  phone: z.string().min(7).max(30).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response | NextResponse> {
  const { token } = await params;
  const tokenData = await verifyPortalToken(token);
  if (!tokenData) {
    return createErrorResponse(new Error("Invalid or expired token"), 401, request);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(new ValidationError("Invalid JSON body"), 400, request);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse(new ValidationError(parsed.error.message), 400, request);
  }

  if (!parsed.data.phone) {
    return createErrorResponse(new ValidationError("Nothing to update"), 400, request);
  }

  const prisma = getPrismaClient();
  const updated = await prisma.tenant.update({
    where: { id: tokenData.tenantId },
    data: { phone: parsed.data.phone },
    select: { id: true, name: true, email: true, phone: true },
  });

  return createSuccessResponse({ phone: updated.phone });
}
