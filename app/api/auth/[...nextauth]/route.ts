import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// Ensure this route executes in the Node.js runtime (Prisma client is not supported in Edge runtime)
export const runtime = 'nodejs';

const handler = NextAuth(getAuthOptions());

// Export handler directly so Next.js provides the proper request context (including `query`)
export { handler as GET, handler as POST };