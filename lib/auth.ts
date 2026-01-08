import { NextAuthOptions } from 'next-auth';
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
      async jwt({ token, user, account: _account }) {
        // Add user ID to token
        if (user) {
          token.id = user.id;
        }
        return token;
      },
      async session({ session, token }) {
        try {
          // Add user ID to session
          if (token && (token as any).id) {
            (session.user as any).id = (token as any).id;
          }
          return session;
        } catch (err: any) {
          console.error('NextAuth session callback error:', err?.name, err?.message);
          console.error(err?.stack);
          // Return session unchanged on error
          return session;
        }
      },
      async signIn({ user, account: _account, profile: _profile }) {
        try {
          // Only perform database operations if database is available
          const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';
          console.log('signIn called. hasDatabase:', hasDatabase, 'email:', user?.email, 'name:', user?.name);
          if (!hasDatabase) {
            console.log('No DATABASE_URL set — allowing sign in (no DB)');
            return true; // Allow sign in without database during build
          }

          // Ensure user exists in database
          if (user.email) {
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
                  name: user.name || '',
                },
              });
              console.log('Created user:', created.id);
            }
          }

          console.log('signIn: returning true for', user?.email);
          return true;
        } catch (err: any) {
          // Log error for diagnostics
          console.error('NextAuth signIn error:', err?.name, err?.message);
          console.error(err?.stack);

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
      async signIn({ user, account, profile: _profile, isNewUser }) {
        console.log('NextAuth event signIn:', { email: user?.email, provider: account?.provider, isNewUser });
      },
      async createUser({ user }) {
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
  } catch (error: any) {
    console.warn('Failed to initialize Prisma adapter, using base auth options:', error?.name, error?.message);
    console.warn(error?.stack);
    return baseAuthOptions;
  }
}