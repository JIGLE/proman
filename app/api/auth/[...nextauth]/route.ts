import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// Ensure this route executes in the Node.js runtime (Prisma client is not supported in Edge runtime)
export const runtime = 'nodejs';

const handler = NextAuth(getAuthOptions());

export async function GET(request: Request) {
  try {
    console.log('Auth route GET:', request.url);
  } catch (e) {
    console.warn('Failed to log request URL in auth GET');
  }
  return handler(request as any);
}

export async function POST(request: Request) {
  try {
    console.log('Auth route POST:', request.url);
  } catch (e) {
    console.warn('Failed to log request URL in auth POST');
  }
  return handler(request as any);
}