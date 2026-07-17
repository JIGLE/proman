import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getPrismaClient } from "@/lib/services/database/database";

export const runtime = "nodejs";

const EPSILON = 0.005;

/**
 * Situs property activity read model: Current Period Status (the reference
 * month the ledger says is next to fill), the PaymentTimeline (recent
 * allocation events for this property's periods — RentPeriod.propertyId is
 * denormalized, so this is one query, no join through Lease), and an audit
 * trail scoped to this property's receipts/periods/leases.
 */
async function handleGet(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  let propertyId: string | undefined;
  if (context?.params) {
    const resolved = context.params instanceof Promise ? await context.params : context.params;
    propertyId = resolved?.id;
  }
  if (!propertyId) {
    return createErrorResponse(new Error("Invalid request: missing id"), 400, request);
  }

  const prisma = getPrismaClient();
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId: scopeUserId },
    select: { id: true },
  });
  if (!property) return createErrorResponse(new Error("Property not found"), 404, request);

  const periods = await prisma.rentPeriod.findMany({
    where: { propertyId, userId: scopeUserId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
    select: {
      id: true,
      year: true,
      month: true,
      status: true,
      dueAmount: true,
      allocatedAmount: true,
    },
  });
  const openPeriod =
    periods.find((p) => p.allocatedAmount < p.dueAmount - EPSILON) ?? periods.at(-1) ?? null;

  let receiptLifecycle: string | null = null;
  if (openPeriod) {
    const receipt = await prisma.receipt.findFirst({
      where: { rentPeriodId: openPeriod.id },
      orderBy: { createdAt: "desc" },
      select: { lifecycle: true },
    });
    receiptLifecycle = receipt?.lifecycle ?? null;
  }

  const allocations = await prisma.paymentAllocation.findMany({
    where: { rentPeriod: { propertyId, userId: scopeUserId } },
    orderBy: { allocatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      amount: true,
      type: true,
      allocatedAt: true,
      reversedAt: true,
      createdBy: true,
      rentPeriod: { select: { year: true, month: true } },
    },
  });

  const [receiptIds, leaseIds] = await Promise.all([
    prisma.receipt.findMany({
      where: { propertyId, userId: scopeUserId },
      select: { id: true },
    }),
    prisma.lease.findMany({ where: { propertyId, userId: scopeUserId }, select: { id: true } }),
  ]);
  const resourceIds = [
    propertyId,
    ...periods.map((p) => p.id),
    ...receiptIds.map((r) => r.id),
    ...leaseIds.map((l) => l.id),
  ];

  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: scopeUserId, resourceId: { in: resourceIds } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, action: true, resourceType: true, createdAt: true, details: true },
  });

  return createSuccessResponse({
    currentPeriod: openPeriod
      ? {
          year: openPeriod.year,
          month: openPeriod.month,
          status: openPeriod.status,
          dueAmount: openPeriod.dueAmount,
          allocatedAmount: openPeriod.allocatedAmount,
        }
      : null,
    receiptLifecycle,
    timeline: allocations.map((a) => ({
      id: a.id,
      amount: a.amount,
      type: a.type,
      allocatedAt: a.allocatedAt,
      reversedAt: a.reversedAt,
      createdBy: a.createdBy,
      period: a.rentPeriod,
    })),
    auditLogs,
  });
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
