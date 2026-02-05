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
import { getPrismaClient } from '@/lib/services/database/database';

function createBaseAuthOptions(): NextAuthOptions {
  const secret = process.env.NEXTAUTH_SECRET;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Only add Google OAuth when real credentials are configured
  const hasRealGoogle = googleClientId
    && googleClientId !== 'dummy-client-id'
    && googleClientSecret
    && googleClientSecret !== 'dummy-client-secret';

  const providers: unknown[] = [];

  if (hasRealGoogle) {
    providers.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  // Credentials provider is always available for demo / self-hosted auth
  providers.push(
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (
          credentials?.email === 'demo@proman.local' &&
          credentials?.password === 'demo123'
        ) {
          try {
            const prisma = getPrismaClient();
            let user = await prisma.user.findUnique({
              where: { email: credentials.email },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email: credentials.email,
                  name: 'Demo User',
                  role: 'ADMIN',
                  imageConsent: true,
                },
              });
            }

            logger.debug('Demo auth successful', { id: user.id });
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            };
          } catch (error) {
            logger.error(
              'Demo auth error',
              error instanceof Error ? error : new Error(String(error)),
            );
            return null;
          }
        }
        return null;
      },
    }),
  );

  // JWT strategy works with both OAuth and CredentialsProvider
  const options: NextAuthOptions = {
    secret,
    providers,
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
    callbacks: {
      async jwt({
        token,
        user,
      }: {
        token: JWT;
        user?: NextAuthUser | null;
        account?: unknown;
      }): Promise<JWT> {
        if (user) {
          const t = token as JWT & {
            id?: string;
            sub?: string;
            email?: string;
            name?: string;
            picture?: string;
          };
          t.id = user.id;
          t.sub = user.id;
          t.email = user.email ?? undefined;
          t.name = user.name ?? undefined;
          t.picture = user.image ?? undefined;
        }
        return token;
      },
      async session({
        session,
        token,
      }: {
        session: Session;
        token: JWT;
        user?: NextAuthUser;
      }): Promise<Session> {
        try {
          if (session?.user) {
            const sessionUser = session.user as {
              id?: string;
              email?: string | null;
              name?: string | null;
              image?: string | null;
            };
            const t = token as JWT & {
              sub?: string;
              id?: string;
              email?: string;
              name?: string;
              picture?: string;
            };
            sessionUser.id = t.sub || t.id;
            if (t.email) sessionUser.email = t.email;
            if (t.name) sessionUser.name = t.name;
            if (t.picture) sessionUser.image = t.picture;
          }
          return session;
        } catch (err: unknown) {
          logger.error(
            'NextAuth session callback error',
            err instanceof Error ? err : new Error(String(err)),
          );
          return session;
        }
      },
      async signIn({
        user,
        account,
      }: {
        user?: NextAuthUser | null;
        account?: Account | undefined;
        profile?: unknown;
      }): Promise<boolean> {
        // Credentials provider — user already validated inside authorize()
        if (account?.provider === 'credentials') return true;

        // For OAuth providers, clean up stale account links
        if (user && account?.provider && account?.providerAccountId) {
          try {
            const prisma = getPrismaClient();
            await prisma.account.deleteMany({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                userId: { not: user.id },
              },
            });
          } catch (error: unknown) {
            logger.warn('Failed to remove stale account before linking', {
              error:
                error instanceof Error ? error.message : String(error),
            });
          }
        }

        return true;
      },
    },
    events: {
      async signIn({
        user,
        account,
        isNewUser,
      }: {
        user?: NextAuthUser | null;
        account?: { provider?: string } | undefined;
        profile?: unknown;
        isNewUser?: boolean;
      }) {
        logger.debug('NextAuth event: signIn', {
          email: user?.email,
          provider: account?.provider,
          isNewUser,
        });
      },
      async createUser({ user }: { user: { id: string; email?: string } }) {
        logger.debug('NextAuth event: createUser', {
          id: user.id,
          email: user.email,
        });
      },
    },
  };

  return options;
}

// JWT strategy doesn't need PrismaAdapter at all
export function getAuthOptions(): NextAuthOptions {
  return createBaseAuthOptions();
}
