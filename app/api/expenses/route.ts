import { NextRequest } from "next/server";
import { requireAuth, handleOptions } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { expenseSchema } from "@/lib/schemas/expense.schema";
import { isMockMode } from "@/lib/config/data-mode";
import { handleDemoGet, handleDemoMutation } from "@/lib/demo/demo-api-handler";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";

async function handleGet(request: NextRequest): Promise<Response> {
  const demo = handleDemoGet(request, "expenses");
  if (demo.response) return demo.response;

  if (isMockMode) {
    return createSuccessResponse([]);
  }
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

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

  const transformedExpenses = expenses.map((expense) => ({
    ...expense,
    propertyName: expense.property.name,
  }));

  return createSuccessResponse(transformedExpenses);
}

async function handlePost(request: NextRequest): Promise<Response> {
  const demo = await handleDemoMutation(request, "expenses");
  if (demo.response) return demo.response;

  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

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

  return createSuccessResponse(
    {
      ...expense,
      propertyName: expense.property.name,
    },
    201,
  );
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const POST = withErrorHandler(withRateLimit(handlePost));
export const OPTIONS = handleOptions;
