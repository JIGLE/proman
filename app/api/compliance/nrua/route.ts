/**
 * API Route: POST /api/compliance/nrua
 * GET  — List NRUA registrations for authenticated user
 * POST — Export a lease to NRUA (Ventanilla Única Digital)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import {
  exportLeaseToNRUA,
  validateNifNie,
} from "@/lib/compliance/nrua-export";
import { getPrismaClient } from "@/lib/services/database/database";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const prisma = getPrismaClient();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "50", 10),
    100,
  );

  const where: Record<string, unknown> = {};
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

  return NextResponse.json({ registrations, total, page, limit });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { leaseId, landlordNif, landlordName } = body;

  if (!leaseId) {
    return NextResponse.json({ error: "leaseId is required" }, { status: 400 });
  }
  if (!landlordNif || !validateNifNie(landlordNif)) {
    return NextResponse.json(
      { error: "Valid landlord NIF/NIE is required" },
      { status: 400 },
    );
  }

  const result = await exportLeaseToNRUA(
    leaseId,
    landlordNif,
    landlordName || "",
  );

  if (!result.success) {
    return NextResponse.json(
      { error: "Export failed", details: result.errors },
      { status: 400 },
    );
  }

  return NextResponse.json(result, { status: 201 });
}
