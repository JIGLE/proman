import { NextRequest, NextResponse } from "next/server";
import { metrics } from "@/lib/monitoring/metrics";

const ALLOWED_EVENT_PREFIX = "landing.";
const RESERVED_KEYS = new Set(["name", "value"]);

function sanitizeTagValue(value: string): string {
  return value.trim().slice(0, 80);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const name = params.get("name")?.trim();

  if (!name || !name.startsWith(ALLOWED_EVENT_PREFIX)) {
    return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
  }

  const valueParam = Number(params.get("value") ?? "1");
  const value = Number.isFinite(valueParam) && valueParam > 0 ? valueParam : 1;

  const tags: Record<string, string> = {};
  for (const [key, rawValue] of params.entries()) {
    if (RESERVED_KEYS.has(key)) continue;
    const normalized = sanitizeTagValue(rawValue);
    if (normalized.length > 0) {
      tags[key] = normalized;
    }
  }

  metrics.increment(name, value, tags);

  return NextResponse.json(
    { ok: true },
    {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
