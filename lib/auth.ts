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

type Account = {
  provider: string;
  providerAccountId: string;
  type: string;
  access_token?: string;
  expires_at?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  token_type?: string;
  session_state?: string;
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
      strategy: 'database', // Use database sessions for better account linking
      maxAge: 30 * 24 * 60 * 60, // 30 days
    } as any, // Type assertion needed for NextAuth types
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
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
      async signIn({ user, account, profile }: { user?: NextAuthUser | null; account?: Account | undefined; profile?: unknown }): Promise<boolean> {
        console.log('signIn called:', {
          hasDatabase: !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim()),
          email: user?.email,
          provider: account?.provider,
          userId: user?.id
        });

        // Handle account linking for existing users
        if (account && user?.email) {
          const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';
          if (hasDatabase) {
            try {
              const prisma = getPrismaClient();
              const existingUser = await prisma.user.findUnique({
                where: { email: user.email },
              });

              if (existingUser) {
                // Check if account already exists
                const existingAccount = await prisma.account.findUnique({
                  where: {
                    provider_providerAccountId: {
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                    },
                  },
                });

                if (!existingAccount) {
                  // Link the account to the existing user
                  await prisma.account.create({
                    data: {
                      userId: existingUser.id,
                      type: account.type,
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                      access_token: account.access_token,
                      expires_at: account.expires_at,
                      refresh_token: account.refresh_token,
                      id_token: account.id_token,
                      scope: account.scope,
                      token_type: account.token_type,
                      session_state: account.session_state,
                    },
                  });
                  console.log('Linked OAuth account to existing user:', existingUser.email);
                }
              }
            } catch (err: unknown) {
              console.error('Error linking account:', err);
              // Continue anyway to allow sign-in
            }
          }
        }

        return true;
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