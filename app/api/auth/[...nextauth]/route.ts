import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

// Prevent static generation for auth routes
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Check if we're in build time (no database available)
const isBuildTime = !process.env.DATABASE_URL;

async function handler(request: NextRequest) {
  if (isBuildTime) {
    // During build time, return a simple response
    return new Response('Auth not available during build', { status: 503 });
  }

  const nextAuthHandler = NextAuth(getAuthOptions());
  return nextAuthHandler(request);
}

export { handler as GET, handler as POST };