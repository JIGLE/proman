/**
 * Cron endpoint for GDPR data retention.
 *
 * Trigger daily via:
 * - Kubernetes CronJob: curl -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/data-retention
 * - GitHub Actions scheduled workflow
 * - Vercel Cron: vercel.json crons config
 *
 * Protected by CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { runDataRetention } from "@/lib/services/data-retention";
import { timingSafeEqualString } from "@/lib/utils/security";

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
    const result = await runDataRetention();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Data retention cron failed:", error);
    return NextResponse.json({ error: "Data retention failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
