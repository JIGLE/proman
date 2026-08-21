import { NextRequest } from "next/server";

import { handleOptions, requireAdmin } from "@/lib/services/auth/auth-middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { runBankProviderCheck } from "@/lib/services/admin/bank-provider-check";

export const runtime = "nodejs";

/**
 * GET /api/admin/bank-provider-check — ask each configured bank provider about its own setup.
 *
 * Read-only in the strongest sense: two GETs to the provider, no consent granted, nothing written
 * here or there. That is what makes it safe to leave as a button an operator can press whenever
 * the bank picker looks wrong.
 *
 * Admin-only, because the answer names the application, its environment and the redirect URLs
 * registered for it — instance configuration, not portfolio data.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  return createSuccessResponse(await runBankProviderCheck());
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
