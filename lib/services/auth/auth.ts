import type { Session, User as NextAuthUser } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { logger } from '@/lib/utils/logger';

// Minimal local typing for NextAuth options we use to avoid fragile cross-package type imports
type NextAuthOptions = {
  secret?: string | undefined;
  providers?: unknown[] | undefined;
  session?: { strategy?: string; maxAge?: number } | undefined;
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
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getPrismaClient } from '@/lib/services/database/database';

function createBaseAuthOptions(): NextAuthOptions {
  const secret = process.env.NEXTAUTH_SECRET;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    logger.debug('Google OAuth not configured: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing');
  }

  const providers = [
    GoogleProvider({
      clientId: googleClientId || '',
      clientSecret: googleClientSecret || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ];

  // Only enable demo credentials in explicit development mode with environment flag
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEMO_AUTH === 'true') {
    logger.warn('Demo credentials enabled - DO NOT use in production!');
    providers.push(
      // @ts-expect-error - CredentialsProvider has different type than OAuthConfig
      CredentialsProvider({
        id: 'credentials',
        name: 'Credentials',
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
           if (credentials?.email === 'demo@proman.local' && credentials?.password === 'demo123') {
             try {
               const prisma = getPrismaClient();
               let user = await prisma.user.findUnique({
                 where: { email: credentials.email }
               });
               
               if (!user) {
                 user = await prisma.user.create({
                   data: {
                     email: credentials.email,
                     name: 'Demo User',
                     role: 'ADMIN',
                     imageConsent: true,
                   }
                 });
               }
               
               logger.debug('Demo auth successful', { id: user.id });
               return user;
             } catch (error) {
               logger.error('Demo auth error', error instanceof Error ? error : new Error(String(error)));
               return null;
             }
           }
           return null;
        }
      })
    );
  }

  const options: NextAuthOptions = {
    secret,
    providers,
    session: {
      strategy: 'database',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
    callbacks: {
      async jwt({ token, user, account: _account }: { token: JWT; user?: NextAuthUser | null; account?: unknown }): Promise<JWT> {
        logger.debug('JWT callback', { userId: user?.id, email: user?.email, hasSub: !!(token as JWT & { sub?: string }).sub });
        
        // When user signs in, set both id and sub claims
        if (user?.id) {
          (token as JWT & { id?: string; sub?: string }).id = user.id;
          (token as JWT & { id?: string; sub?: string }).sub = user.id; // Standard JWT subject claim - required for session to work
        }
        
        return token;
      },
      async session({ session, token, user }: { session: Session; token: JWT; user?: NextAuthUser }): Promise<Session> {
        try {
          if (session?.user) {
            const sessionUser = session.user as { id?: string };
            
            // Prefer token.sub (standard claim), fallback to token.id or user.id
            sessionUser.id = (token as JWT & { sub?: string; id?: string }).sub || (token as JWT & { sub?: string; id?: string }).id || user?.id;
            
            if (!sessionUser.id) {
              logger.error('No user ID found in session', undefined, { 
                hasSub: !!(token as JWT & { sub?: string; id?: string }).sub, 
                hasTokenId: !!(token as JWT & { sub?: string; id?: string }).id,
                hasUser: !!user 
              });
            }
          }
          return session;
        } catch (err: unknown) {
          logger.error('NextAuth session callback error', err instanceof Error ? err : new Error(String(err)));
          return session;
        }
      },
      async signIn({ user, account, profile: _profile }: { user?: NextAuthUser | null; account?: Account | undefined; profile?: unknown }): Promise<boolean> {
        logger.debug('signIn callback', {
          hasDatabase: !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim()),
          email: user?.email,
          provider: account?.provider,
          userId: user?.id
        });

        if (user && account && account.provider && account.providerAccountId) {
          try {
            const prisma = getPrismaClient();
            await prisma.account.deleteMany({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                userId: {
                  not: user.id,
                },
              },
            });
          } catch (error: unknown) {
            logger.warn('Failed to remove stale account before linking', { error: error instanceof Error ? error.message : String(error) });
          }
        }

        return true;
      },
    },
    events: {
      async signIn({ user, account, profile: _profile, isNewUser }: { user?: NextAuthUser | null; account?: { provider?: string } | undefined; profile?: unknown; isNewUser?: boolean }) {
        logger.debug('NextAuth event: signIn', { email: user?.email, provider: account?.provider, isNewUser });
      },
      async createUser({ user }: { user: { id: string; email?: string } }) {
        logger.debug('NextAuth event: createUser', { id: user.id, email: user.email });
      },
    },
  };

  return options;
}

// Lazy adapter initialization to avoid build-time issues
export function getAuthOptions(): NextAuthOptions {
  logger.debug('getAuthOptions called', { hasDatabase: !!process.env.DATABASE_URL });
  // Only add adapter if we have database access and we're not in build time
  const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || !process.env.NODE_ENV;

  const baseAuthOptions = createBaseAuthOptions();

  if (!hasDatabase || isBuildTime) {
    logger.debug('Using base auth options', { hasDatabase, isBuildTime });
    return baseAuthOptions;
  }

  try {
    logger.debug('Initializing Prisma adapter');
    return {
      ...baseAuthOptions,
      adapter: PrismaAdapter(getPrismaClient()),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    logger.warn('Failed to initialize Prisma adapter, using base auth options', { error: message });
    return baseAuthOptions;
  }
}
