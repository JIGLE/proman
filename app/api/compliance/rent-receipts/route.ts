/**
 * API Route: POST /api/compliance/rent-receipts
 * GET  — List receipts for authenticated user
 * POST — Create a new Recibo de Renda Eletrónico
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import {
  createRentReceipt,
  listRentReceipts,
} from "@/lib/compliance/rent-receipts-pt";
import type { RentReceiptInput } from "@/lib/compliance/rent-receipts-pt";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId") ?? undefined;
  const propertyId = url.searchParams.get("propertyId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const year = url.searchParams.get("year")
    ? parseInt(url.searchParams.get("year")!, 10)
    : undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "50", 10),
    100,
  );

  const result = await listRentReceipts(userId, {
    tenantId,
    propertyId,
    status,
    year,
    page,
    limit,
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const body = await request.json();

  const input: RentReceiptInput = {
    userId,
    tenantId: body.tenantId,
    propertyId: body.propertyId,
    leaseId: body.leaseId,
    landlordNif: body.landlordNif,
    tenantNif: body.tenantNif,
    propertyAddress: body.propertyAddress,
    cadasterReference: body.cadasterReference,
    rentAmount: body.rentAmount,
    withholdingRate: body.withholdingRate,
    paymentDate: new Date(body.paymentDate),
    periodStart: new Date(body.periodStart),
    periodEnd: new Date(body.periodEnd),
    isRendaAcessivel: body.isRendaAcessivel,
  };

  const result = await createRentReceipt(input);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.errors },
      { status: 400 },
    );
  }

  return NextResponse.json(result, { status: 201 });
}
