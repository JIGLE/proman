import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

// Authentication middleware for API routes
export async function requireAuth(_request: NextRequest): Promise<{
  session: Session;
  userId: string;
} | NextResponse> {
  try {
    // Import next-auth lazily so tests can mock getServerSession before we call it
    const mod = await import('next-auth/next').catch(() => import('next-auth'));
    type GetServerSession = (opts?: ReturnType<typeof getAuthOptions>) => Promise<Session | null>;
    const maybe = mod as { getServerSession?: GetServerSession };
    const getServerSession = maybe.getServerSession;

    // Call getServerSession at runtime (not module load time) so tests can stub it
    const session = (await getServerSession?.(getAuthOptions())) ?? null;

    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Support multiple session shapes in tests: prefer email-based lookup when
    // available (real auth), but accept a session.user.id fallback used by tests/mocks.
    if (session.user?.email) {
      // Find or create user in database (database accessor is lazy as well)
      const { getPrismaClient } = await import('@/lib/database');
      const prisma = getPrismaClient();
      let user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user) {
        // Create user if not found (fallback for auth issues)
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || '',
          },
        });
        console.log('Created missing user:', user.id);
      }

      return { session, userId: user.id };
    }

    if (session.user?.id) {
      // Tests may provide a user id directly; use it as the authenticated user id
      return { session, userId: session.user.id };
    }

    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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
export function corsHeaders(): Record<string, string> {
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

export async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { session } = authResult;
  if (session.user.role !== 'ADMIN') {
    return new NextResponse(
      JSON.stringify({ error: 'Forbidden: Admin access required' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  return authResult;
}
