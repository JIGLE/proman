import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getBankProvider, configuredProviders } from "@/lib/services/bank/providers/registry";

export const runtime = "nodejs";

/**
 * GET /api/bank/institutions?country=PT — banks available to connect, for the picker.
 *
 * Answers 503 rather than an empty list when no provider is configured. An empty list would read
 * as "your bank is not supported", which is a different problem with a different remedy.
 */
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;

  const country = request.nextUrl.searchParams.get("country") ?? "";
  if (!/^[A-Za-z]{2}$/.test(country)) {
    return createErrorResponse(new Error("country must be a 2-letter ISO code"), 400, request);
  }

  const available = configuredProviders();
  if (available.length === 0) {
    return createErrorResponse(
      new Error("No bank data provider is configured on this instance"),
      503,
      request,
    );
  }

  // Explicit, and validated against the configured set. This used to be
  // `const [providerKey] = configuredProviders()` — first-wins, so on an instance with two
  // providers the picker's choice was discarded in favour of whichever sorted first.
  // Defaulting to the only one keeps single-provider callers working unchanged.
  const requested = request.nextUrl.searchParams.get("provider")?.trim().toLowerCase();
  const providerKey = requested ?? available[0];
  if (!available.includes(providerKey)) {
    return createErrorResponse(
      new Error("That bank data provider is not available on this instance"),
      400,
      request,
    );
  }

  const provider = getBankProvider(providerKey);
  if (!provider) {
    return createErrorResponse(new Error("Bank provider unavailable"), 503, request);
  }

  // `totalAvailable` is what the application can reach before the country filter. The picker
  // needs it to tell "this provider has banks, none of them here" from "this provider has no
  // banks at all" — see InstitutionListing in providers/types.ts for why that mattered.
  const { institutions, totalAvailable } = await provider.listInstitutions(country.toUpperCase());
  return createSuccessResponse({ providerKey, institutions, totalAvailable });
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const OPTIONS = handleOptions;
