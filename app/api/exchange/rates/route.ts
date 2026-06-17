import { NextRequest, NextResponse } from "next/server";
import { getRates } from "@/lib/exchange";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const base = (url.searchParams.get("base") || "EUR").toUpperCase();
    const data = await getRates(base);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching exchange rates:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch exchange rates" },
      { status: 500 },
    );
  }
}
