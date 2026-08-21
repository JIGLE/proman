import { NextRequest } from "next/server";

import { handleOptions, requireAdmin } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getInstanceMetrics } from "@/lib/services/admin/instance-metrics";
import { generateFinancialReport } from "@/lib/services/financial-reports";

export const runtime = "nodejs";

/**
 * GET /api/admin/metrics — the two families, kept apart.
 *
 * PORTFOLIO is scoped to the calling admin's own userId, not summed across the instance. Every
 * read in this app is user-scoped; an admin reading another account's rent would break that
 * boundary for a number nobody asked for. The UI labels the scope rather than implying it.
 *
 * It reuses `generateFinancialReport`, which is what makes this page agree with Intelligence. A
 * second aggregation over the same rows would drift, and two screens disagreeing about rent is
 * worse than one screen not showing it.
 *
 * INSTANCE is cross-user by nature — accounts, storage, activation — and is already admin-gated.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const now = new Date();
  const year = now.getUTCFullYear();
  // Calendar year to date. Fixed rather than a parameter: this page answers "how is the instance
  // doing", and a date picker here would duplicate Intelligence, which owns period analysis.
  const startDate = `${year}-01-01`;
  const endDate = now.toISOString().slice(0, 10);

  const [portfolio, instance] = await Promise.all([
    generateFinancialReport(authResult.userId, startDate, endDate).catch(() => null),
    getInstanceMetrics(),
  ]);

  return createSuccessResponse({
    period: { startDate, endDate },
    // null when the report could not be produced — the UI says so rather than rendering zeros,
    // which would read as "you collected no rent this year".
    portfolio: portfolio
      ? {
          income: portfolio.income.total,
          rent: portfolio.income.totalRent,
          expenses: portfolio.expenses.total,
          netIncome: portfolio.netIncome,
          profitMargin: portfolio.profitMargin,
          expensesByCategory: portfolio.expenses.byCategory,
        }
      : null,
    instance,
  });
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
