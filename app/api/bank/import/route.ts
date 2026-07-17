import { NextRequest } from "next/server";

import { handleOptions, requireOwnerAccess } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  parseBody,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { bankImportSchema } from "@/lib/schemas/bank.schema";
import { parseBankCsv } from "@/lib/services/bank/csv";
import { importBankRows } from "@/lib/services/bank/import";

export const runtime = "nodejs";

// POST /api/bank/import — import bank movements from CSV text or manual rows.
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;
  const { scopeUserId } = authResult;

  const body = parseBody(await request.json(), bankImportSchema);

  let rows = body.rows ?? [];
  const parseErrors: string[] = [];
  if (body.csv) {
    const parsed = parseBankCsv(body.csv);
    rows = [...rows, ...parsed.rows];
    parseErrors.push(...parsed.errors);
  }
  if (rows.length === 0) {
    return createErrorResponse(
      new Error(
        parseErrors.length > 0
          ? `No importable rows: ${parseErrors.join("; ")}`
          : "No importable rows",
      ),
      400,
      request,
    );
  }

  const summary = await importBankRows(scopeUserId, rows, body.csv ? "csv_import" : "manual_entry");

  return createSuccessResponse({ ...summary, parseErrors }, 201);
}

export const POST = withErrorHandler(withRateLimit(handlePost));
export const OPTIONS = handleOptions;
