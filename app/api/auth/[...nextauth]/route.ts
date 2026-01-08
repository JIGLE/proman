import NextAuth from 'next-auth/next';
import type { NextRequest } from 'next/server';
import { getAuthOptions } from '@/lib/auth';

// Ensure this route executes in the Node.js runtime (Prisma client is not supported in Edge runtime)
export const runtime = 'nodejs';

// next-auth/next exports a handler function; cast to a callable that accepts NextRequest and returns Response | Promise<Response>.
const handler = (NextAuth as unknown as (opts: unknown) => (req: NextRequest) => Response | Promise<Response>)(
  getAuthOptions() as unknown
);

// Export handler directly so Next.js provides the proper request context (including `query`)
export { handler as GET, handler as POST };