import type { Session } from "next-auth";

/**
 * Create a development-only session for local testing without database.
 * Only active when NODE_ENV=development and NEXT_PUBLIC_DEV_AUTH=true.
 */
export function createDevSession(): Session {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

  return {
    user: {
      id: "dev-user",
      email: "dev@example.local",
      name: "Dev User",
      image: null,
    },
    expires: expiresAt.toISOString(),
  };
}

/**
 * Check if dev auth mode is enabled.
 * Requires both NODE_ENV=development and NEXT_PUBLIC_DEV_AUTH=true.
 */
export function isDevAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_AUTH === "true"
  );
}
