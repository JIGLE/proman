/**
 * Cron endpoint for the daily bank sync.
 *
 * Trigger daily via:
 * - Kubernetes CronJob: curl -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/bank-sync
 * - GitHub Actions: scheduled workflow
 * - Vercel Cron: vercel.json crons config
 *
 * Protected by CRON_SECRET env var to prevent unauthorized triggers.
 *
 * Once a day is deliberate, not a starting point: the provider's free tier allows only a handful
 * of reads per account per day, and `syncAllDueConnections` enforces that budget itself. Running
 * this hourly would spend the whole allowance before anyone could press "Sync now".
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAllDueConnections } from "@/lib/services/bank/sync";
import { timingSafeEqualString } from "@/lib/utils/security";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!timingSafeEqualString(token, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await syncAllDueConnections();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    logger.error(
      "Scheduled bank sync failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: "Bank sync failed" }, { status: 500 });
  }
}
