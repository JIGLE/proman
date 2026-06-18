import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult as NextResponse;

  const url = new URL(request.url);
  const propertyIdsParam = url.searchParams.get("propertyIds") ?? "";
  const yearParam = url.searchParams.get("year");

  if (!propertyIdsParam || !yearParam) {
    return NextResponse.json({ error: "propertyIds and year are required" }, { status: 400 });
  }

  const propertyIds = propertyIdsParam.split(",").filter(Boolean);
  const year = parseInt(yearParam, 10);

  if (isNaN(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  const [receipts, expenses] = await Promise.all([
    prisma.receipt.findMany({
      where: {
        userId: authResult.userId,
        type: "rent",
        status: "paid",
        propertyId: { in: propertyIds },
      },
      select: { amount: true, date: true },
    }),
    prisma.expense.findMany({
      where: {
        userId: authResult.userId,
        isDeductible: true,
        propertyId: { in: propertyIds },
      },
      select: { amount: true, date: true },
    }),
  ]);

  const grossIncome = receipts
    .filter((r) => new Date(r.date).getFullYear() === year)
    .reduce((sum, r) => sum + r.amount, 0);

  const deductibleExpenses = expenses
    .filter((e) => new Date(e.date).getFullYear() === year)
    .reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({ data: { grossIncome, deductibleExpenses } });
}
