/**
 * Demo Mode Initialization Endpoint
 *
 * POST: Sets the demo cookie and returns success
 * GET: Returns current demo mode status
 */

import { NextResponse } from "next/server";
import { isDemoRequest, demoCookieSetHeader, DEMO_COOKIE_MAX_AGE } from "@/lib/demo/demo-mode";

export async function POST(_request: Request) {
  const response = NextResponse.json({
    success: true,
    message: "Demo mode activated",
    expiresIn: DEMO_COOKIE_MAX_AGE,
  });

  response.headers.set("Set-Cookie", demoCookieSetHeader());
  return response;
}

export async function GET(request: Request) {
  const isDemo = isDemoRequest(request);
  return NextResponse.json({ demo: isDemo });
}
