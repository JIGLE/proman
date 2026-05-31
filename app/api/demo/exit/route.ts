/**
 * Demo Mode Exit Endpoint
 *
 * POST: Clears the demo cookie and returns success
 */

import { NextResponse } from "next/server";
import { demoCookieClearHeader } from "@/lib/demo/demo-mode";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Demo mode deactivated",
  });

  response.headers.set("Set-Cookie", demoCookieClearHeader());
  return response;
}
