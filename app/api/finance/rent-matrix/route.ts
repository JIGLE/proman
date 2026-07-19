import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

export const runtime = "nodejs";

/**
 * Situs Rent Matrix read model: for a given year, every lease's 12 reference
 * months with their persisted-derived statuses — one query over the
 * RentPeriod ledger (Migration A), no joins per cell.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const url = new URL(request.url);
  const yearParam = Number(url.searchParams.get("year"));
  const year =
    Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= 2100
      ? yearParam
      : new Date().getUTCFullYear();

  const prisma = getPrismaClient();
  const periods = await prisma.rentPeriod.findMany({
    where: { userId, year },
    select: {
      leaseId: true,
      month: true,
      status: true,
      dueAmount: true,
      allocatedAmount: true,
      tenant: { select: { name: true } },
      property: { select: { name: true } },
    },
    orderBy: [{ leaseId: "asc" }, { month: "asc" }],
  });

  const rows = new Map<
    string,
    {
      leaseId: string;
      tenantName: string;
      propertyName: string;
      months: Record<number, { status: string; dueAmount: number; allocatedAmount: number }>;
    }
  >();
  for (const p of periods) {
    let row = rows.get(p.leaseId);
    if (!row) {
      row = {
        leaseId: p.leaseId,
        tenantName: p.tenant.name,
        propertyName: p.property.name,
        months: {},
      };
      rows.set(p.leaseId, row);
    }
    row.months[p.month] = {
      status: p.status,
      dueAmount: p.dueAmount,
      allocatedAmount: p.allocatedAmount,
    };
  }

  return NextResponse.json({ success: true, data: { year, rows: Array.from(rows.values()) } });
}
