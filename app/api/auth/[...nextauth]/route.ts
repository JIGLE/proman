import NextAuth from 'next-auth';
import type { InitOptions as NextAuthInitOptions } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// Ensure this route executes in the Node.js runtime (Prisma client is not supported in Edge runtime)
export const runtime = 'nodejs';

// next-auth returns a handler with framework-specific typing; cast options to the NextAuth init type to avoid using `any`
const handler = NextAuth(getAuthOptions() as unknown as NextAuthInitOptions);

// Export handler directly so Next.js provides the proper request context (including `query`)
export { handler as GET, handler as POST };