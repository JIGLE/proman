import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
  // Database - optional in development (will use mock data)
  DATABASE_URL: z.string().url().optional(),

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
  // Feature flags (use 'true' to enable)
  ENABLE_STRIPE: z.string().optional(),
  ENABLE_SENDGRID: z.string().optional(),
  ENABLE_OAUTH: z.string().optional(),
});

// Validate environment variables
let env: z.infer<typeof envSchema> | undefined;

const parsed = envSchema.safeParse(process.env);

if (parsed.success) {
  env = parsed.data;
  
  // Enforce DATABASE_URL in non-development environments
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test' && !env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required in production environments');
    process.exit(1);
  }
} else {
  // If we're in test mode, tolerate missing environment variables and provide sensible defaults
  if (process.env.NODE_ENV === 'test') {
    console.debug('⚠️ Environment validation failed, but continuing because NODE_ENV=test:', parsed.error);
    const partialEnv = envSchema.partial().parse(process.env);
    env = {
      DATABASE_URL: partialEnv.DATABASE_URL,
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

/**
 * Helper: read a secret from env or from mounted secret files (if present).
 * Looks up process.env first, then common secret file mounts.
 */
import fs from 'fs';
import path from 'path';

export function getSecret(name: string): string | undefined {
  const envVal = process.env[name];
  if (envVal && envVal.length > 0) return envVal;

  const candidatePaths = [
    `/run/secrets/${name}`,
    `/var/run/secrets/${name}`,
    path.join(process.cwd(), 'secrets', name),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const val = fs.readFileSync(p, 'utf8').trim();
        if (val.length > 0) return val;
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

/**
 * Helper: feature flag parsing. Returns true when env value is 'true' or '1'.
 */
export function isEnabled(envName: string): boolean {
  const v = process.env[envName] || undefined;
  if (!v) return false;
  return v.toLowerCase() === 'true' || v === '1';
}

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
