import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// Ensure this route executes in the Node.js runtime (Prisma client is not supported in Edge runtime)
export const runtime = 'nodejs';

// next-auth returns a handler with framework-specific typing; cast to any to avoid fragile typing here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = (NextAuth as any)(getAuthOptions());

// Export handler directly so Next.js provides the proper request context (including `query`)
export { handler as GET, handler as POST };