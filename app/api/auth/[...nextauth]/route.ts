import NextAuth from 'next-auth/next';
import type { NextRequest } from 'next/server';
import { getAuthOptions } from '@/lib/services/auth/auth';

// Ensure this route executes in the Node.js runtime (Prisma client is not supported in Edge runtime)
export const runtime = 'nodejs';

// next-auth/next exports a handler factory; type it using the return type of `getAuthOptions` for safety
const handler = (NextAuth as (opts: ReturnType<typeof getAuthOptions>) => (req: NextRequest) => Response | Promise<Response>)(
  getAuthOptions()
);

// Export handler directly so Next.js provides the proper request context (including `query`)
export { handler as GET, handler as POST };