import type { Session, User as NextAuthUser } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// Minimal local typing for NextAuth options we use to avoid fragile cross-package type imports
type NextAuthOptions = {
  secret?: string | undefined;
  providers?: unknown[] | undefined;
  session?: { strategy?: string } | undefined;
  callbacks?: Record<string, unknown> | undefined;
  events?: Record<string, unknown> | undefined;
  pages?: Record<string, string> | undefined;
  adapter?: unknown;
};

import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getPrismaClient } from '@/lib/database';

function createBaseAuthOptions(): NextAuthOptions {
  const secret = process.env.NEXTAUTH_SECRET;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    console.warn('Google OAuth not configured: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing');
  }

  const options: NextAuthOptions = {
    secret,
    providers: [
      GoogleProvider({
        clientId: googleClientId || '',
        clientSecret: googleClientSecret || '',
      }),
    ],
    session: {
      strategy: 'jwt',
    },
    callbacks: {
      async jwt({ token, user, account: _account }: { token: JWT; user?: NextAuthUser | null; account?: unknown }): Promise<JWT> {
        // Add user ID to token
        if (user) {
          (token as JWT & { id?: string }).id = user.id;
        }
        return token;
      },
      async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
        try {
          // Add user ID to session
          if (token && (token as JWT & { id?: string }).id) {
            const user = session.user as { id?: string };
            user.id = (token as JWT & { id?: string }).id;
          }
          return session;
        } catch (err: unknown) {
          console.error('NextAuth session callback error:', err);
          // Return session unchanged on error
          return session;
        }
      },
      async signIn({ user, account: _account, profile: _profile }: { user?: NextAuthUser | null; account?: { provider?: string } | undefined; profile?: unknown }): Promise<boolean> {
        try {
          // Only perform database operations if database is available
          const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';
          console.log('signIn called. hasDatabase:', hasDatabase, 'email:', user?.email, 'name:', user?.name);
          if (!hasDatabase) {
            console.log('No DATABASE_URL set — allowing sign in (no DB)');
            return true; // Allow sign in without database during build
          }

          // Ensure user exists in database (guard user and email)
          if (user?.email) {
            const prisma = getPrismaClient();
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email },
            });

            console.log('Prisma lookup result for', user.email, ':', !!existingUser);

            if (!existingUser) {
              // Create user if they don't exist
              const created = await prisma.user.create({
                data: {
                  email: user.email,
                  name: user?.name || '',
                },
              });
              console.log('Created user:', created.id);
            }
          }

          console.log('signIn: returning true for', user?.email);
          return true;
        } catch (err: unknown) {
          // Log error for diagnostics
          console.error('NextAuth signIn error:', err);

          // Allow an override to permit sign-ins while DB issues are being resolved
          if (process.env.NEXTAUTH_ALLOW_DB_FAILURE === 'true') {
            console.warn('NEXTAUTH_ALLOW_DB_FAILURE=true — allowing sign-in despite DB error');
            return true;
          }

          return false;
        }
      },
    },
    events: {
      async signIn({ user, account, profile: _profile, isNewUser }: { user?: NextAuthUser | null; account?: { provider?: string } | undefined; profile?: unknown; isNewUser?: boolean }) {
        console.log('NextAuth event signIn:', { email: user?.email, provider: account?.provider, isNewUser });
      },
      async createUser({ user }: { user: { id: string; email?: string } }) {
        console.log('NextAuth event createUser:', { id: user.id, email: user.email });
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
  };

  return options;
}

// Lazy adapter initialization to avoid build-time issues
export function getAuthOptions(): NextAuthOptions {
  console.log('getAuthOptions called, DATABASE_URL:', !!process.env.DATABASE_URL);
  // Only add adapter if we have database access and we're not in build time
  const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || !process.env.NODE_ENV;

  const baseAuthOptions = createBaseAuthOptions();

  if (!hasDatabase || isBuildTime) {
    console.log('Using base auth options, hasDatabase:', hasDatabase, 'isBuildTime:', isBuildTime);
    return baseAuthOptions;
  }

  try {
    console.log('Trying to initialize Prisma adapter');
    return {
      ...baseAuthOptions,
      adapter: PrismaAdapter(getPrismaClient()),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.warn('Failed to initialize Prisma adapter, using base auth options:', message);
    if (error instanceof Error) console.warn(error.stack);
    return baseAuthOptions;
  }
}