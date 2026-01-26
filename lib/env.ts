import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: Email service (for future use)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

// Validate environment variables
let env: z.infer<typeof envSchema> | undefined;

const parsed = envSchema.safeParse(process.env);

if (parsed.success) {
  env = parsed.data;
} else {
  // If we're in test mode, tolerate missing environment variables and provide sensible defaults
  if (process.env.NODE_ENV === 'test') {
    console.debug('⚠️ Environment validation failed, but continuing because NODE_ENV=test:', parsed.error);
    const partialEnv = envSchema.partial().parse(process.env);
    env = {
      DATABASE_URL: partialEnv.DATABASE_URL ?? 'file:./dev.db',
      NEXTAUTH_URL: partialEnv.NEXTAUTH_URL ?? 'http://localhost:3000',
      NEXTAUTH_SECRET: partialEnv.NEXTAUTH_SECRET ?? 'test-secret-should-be-long-enough-for-dev',
      GOOGLE_CLIENT_ID: partialEnv.GOOGLE_CLIENT_ID ?? '',
      GOOGLE_CLIENT_SECRET: partialEnv.GOOGLE_CLIENT_SECRET ?? '',
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'test',
      SMTP_HOST: partialEnv.SMTP_HOST,
      SMTP_PORT: partialEnv.SMTP_PORT,
      SMTP_USER: partialEnv.SMTP_USER,
      SMTP_PASS: partialEnv.SMTP_PASS,
    } as z.infer<typeof envSchema>;
  } else {
    console.error('❌ Invalid environment variables:', parsed.error);
    process.exit(1);
  }
}

export { env as env };

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
