import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// Authentication middleware for API routes
export async function requireAuth(_request: NextRequest): Promise<{
  session: Session;
  userId: string;
} | NextResponse> {
  try {
    const mod = await import('next-auth/next').catch(() => import('next-auth'));
    const maybe = mod as unknown as { getServerSession?: (opts?: unknown) => Promise<unknown> };
    const getServerSession = maybe.getServerSession;
    const session = (await getServerSession?.(getAuthOptions())) as Session | null;

    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract user ID from session
    const user = session.user as { id?: string };
    const userId = user.id;

    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid session' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return { session, userId };
  } catch (error: unknown) {
    console.error('requireAuth error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Authentication failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Authorization middleware for resource ownership
export async function requireOwnership(
  request: NextRequest,
  resourceUserId: string
): Promise<void | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  if (userId !== resourceUserId) {
    return new NextResponse(
      JSON.stringify({ error: 'Access denied' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// CORS headers for API responses
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Handle OPTIONS requests for CORS
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}