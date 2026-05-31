/**
 * API Route: /api/compliance/nrua
 * GET  — List NRUA registrations for authenticated user
 * POST — Export a lease to NRUA (Ventanilla Única Digital)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { exportLeaseToNRUA, validateNifNie } from "@/lib/compliance/nrua-export";
import { logAudit } from "@/lib/services/audit-log";
import { withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getPrismaClient } from "@/lib/services/database/database";

// ─── Request body schema ────────────────────────────────────────────────────
const nruaPostSchema = z.object({
  // Accept non-CUID ids in tests/legacy data; real validation happens in exportLeaseToNRUA
  leaseId: z.string().min(1),
  landlordNif: z
    .string()
    .min(9)
    .refine((v) => validateNifNie(v), { message: "Valid landlord NIF/NIE is required" }),
  landlordName: z.string().min(2),
});

// ─── Handlers ──────────────────────────────────────────────────────────────
async function handleGet(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  // Filter by user ownership: user must own either the lease or the property
  const where: Record<string, unknown> = {
    OR: [{ lease: { userId } }, { property: { userId } }],
  };
  if (status) where.status = status;

  const [registrations, total] = await Promise.all([
    prisma.nRUARegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.nRUARegistration.count({ where }),
  ]);

  await logAudit({
    userId,
    action: "VIEW_NRUA_REGISTRATIONS",
    resourceType: "NRUARegistration",
    details: { status, page, limit, resultCount: registrations.length, total },
  });

  return NextResponse.json({ registrations, total, page, limit });
}

async function handlePost(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const rawBody: unknown = await request.json();
  const parsed = nruaPostSchema.safeParse(rawBody);
  if (!parsed.success) {
    await logAudit({
      userId,
      action: "EXPORT_NRUA_REGISTRATION",
      resourceType: "Lease",
      details: { success: false, reason: "validation_failed", errors: parsed.error.flatten() },
    });
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { leaseId, landlordNif, landlordName } = parsed.data;

  const result = await exportLeaseToNRUA(leaseId, landlordNif, landlordName, userId);

  await logAudit({
    userId,
    action: "EXPORT_NRUA_REGISTRATION",
    resourceType: "Lease",
    resourceId: leaseId,
    details: {
      success: result.success,
      landlordNif,
      registrationId: result.registrationId,
      errors: result.errors,
    },
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Export failed", details: result.errors },
      { status: result.status || 400 },
    );
  }

  return NextResponse.json(result, { status: 201 });
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const POST = withErrorHandler(withRateLimit(handlePost));
