import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// Ensure this route executes in the Node.js runtime (Prisma client is not supported in Edge runtime)
export const runtime = 'nodejs';

const handler = NextAuth(getAuthOptions());

export async function GET(request: Request) {
  try {
    console.log('Auth route GET:', request.url);
    return await handler(request as any);
  } catch (err: any) {
    console.error('Auth route GET error:', err?.name, err?.message);
    console.error(err?.stack);
    return new Response(JSON.stringify({ error: 'internal', message: err?.message }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('Auth route POST:', request.url);
    return await handler(request as any);
  } catch (err: any) {
    console.error('Auth route POST error:', err?.name, err?.message);
    console.error(err?.stack);
    return new Response(JSON.stringify({ error: 'internal', message: err?.message }), { status: 500 });
  }
}