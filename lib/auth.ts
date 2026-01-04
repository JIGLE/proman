import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getPrismaClient } from '@/lib/database';

const baseAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Add user ID to token
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token.id) {
        (session.user as any).id = token.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
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
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

// Lazy adapter initialization to avoid build-time issues
export function getAuthOptions(): NextAuthOptions {
  console.log('getAuthOptions called, DATABASE_URL:', !!process.env.DATABASE_URL);
  // Only add adapter if we have database access and we're not in build time
  const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || !process.env.NODE_ENV;

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