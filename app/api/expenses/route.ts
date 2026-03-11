import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  handleOptions,
} from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { expenseSchema } from "@/lib/utils/validation";
import { isMockMode } from "@/lib/config/data-mode";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // In mock mode, return empty array
    if (isMockMode) {
      return NextResponse.json([]);
    }
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult as NextResponse;

    const { userId } = authResult;
    const prisma = getPrismaClient();

    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: {
        property: {
          select: {
            name: true,
          },
        },
      },
    });

    // Transform expenses to include propertyName flat
    const transformedExpenses = expenses.map((expense) => ({
      ...expense,
      propertyName: expense.property.name,
    }));

    return NextResponse.json(transformedExpenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult as NextResponse;

    const { userId } = authResult;
    const prisma = getPrismaClient();

    const json = await request.json();
    const body = expenseSchema.parse(json);

    const expense = await prisma.expense.create({
      data: {
        ...body,
        userId,
        date: new Date(body.date),
      },
      include: {
        property: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...expense,
      propertyName: expense.property.name,
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}

export const OPTIONS = handleOptions;
