/**
 * API Route: POST /api/compliance/nrua
 * GET  — List NRUA registrations for authenticated user
 * POST — Export a lease to NRUA (Ventanilla Única Digital)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { exportLeaseToNRUA, validateNifNie } from "@/lib/compliance/nrua-export";
import { logAudit } from "@/lib/services/audit-log";
import { getPrismaClient } from "@/lib/services/database/database";

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const body = await request.json();
  const { leaseId, landlordNif, landlordName } = body;

  if (!leaseId) {
    await logAudit({
      userId,
      action: "EXPORT_NRUA_REGISTRATION",
      resourceType: "Lease",
      details: { success: false, reason: "missing_lease_id" },
    });
    return NextResponse.json({ error: "leaseId is required" }, { status: 400 });
  }
  if (!landlordNif || !validateNifNie(landlordNif)) {
    await logAudit({
      userId,
      action: "EXPORT_NRUA_REGISTRATION",
      resourceType: "Lease",
      resourceId: leaseId,
      details: { success: false, reason: "invalid_landlord_nif" },
    });
    return NextResponse.json({ error: "Valid landlord NIF/NIE is required" }, { status: 400 });
  }

  const result = await exportLeaseToNRUA(leaseId, landlordNif, landlordName || "", userId);

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
