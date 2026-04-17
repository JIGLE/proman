/**
 * Demo Mode Utilities
 *
 * Provides helpers for detecting and managing the public demo mode.
 * Demo mode allows exploration of the app without authentication
 * and enforces read-only access (no database writes).
 *
 * NOTE: This file is imported by both server and client components.
 * The `cookies` import from `next/headers` is lazily loaded inside
 * `isDemoMode()` to avoid breaking client-side imports.
 */

/** Cookie name used to flag a demo session */
export const DEMO_COOKIE_NAME = "proman_demo";
export const DEMO_ROLE_COOKIE_NAME = "proman_demo_role";
export const DEMO_TENANT_COOKIE_NAME = "proman_demo_tenant";

/** Max age for the demo cookie (1 hour) */
export const DEMO_COOKIE_MAX_AGE = 60 * 60;

/** Demo user constants — matches the existing demo credentials provider */
export const DEMO_USER = {
  id: "demo-user",
  email: "demo@proman.local",
  name: "Demo User",
  role: "ADMIN" as const,
  image: null,
};

export const DEMO_CREDENTIALS = {
  email: "demo@proman.local",
  password: "demo123",
};

export type DemoPortalRole = "owner" | "tenant";

/** Routes that are blocked in demo mode */
export const DEMO_BLOCKED_PATHS = ["/settings", "/api/user", "/api/debug"] as const;

/**
 * Check if a request is in demo mode (server-side, from request headers).
 * Use this in API routes / middleware where you have the request object.
 */
export function isDemoRequest(request: Request): boolean {
  try {
    const cookieHeader = request.headers?.get("cookie") || "";
    return cookieHeader.includes(`${DEMO_COOKIE_NAME}=1`);
  } catch {
    return false;
  }
}

/**
 * Check if demo mode is active from server components (reads cookies()).
 * Cannot be used in middleware or client components — use isDemoRequest or isDemoModeClient there.
 */
export async function isDemoMode(): Promise<boolean> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(DEMO_COOKIE_NAME)?.value === "1";
  } catch {
    return false;
  }
}

/**
 * Check if a path should be blocked in demo mode.
 */
export function isDemoBlockedPath(pathname: string): boolean {
  return DEMO_BLOCKED_PATHS.some(
    (blocked) => pathname === blocked || pathname.startsWith(blocked + "/"),
  );
}

/**
 * Build the Set-Cookie header value for enabling demo mode.
 * Cookie is intentionally NOT HttpOnly — it contains no secrets (just "1")
 * and needs to be readable by client JS so demo mode works without any API calls.
 */
export function demoCookieSetHeader(): string {
  const parts = [
    `${DEMO_COOKIE_NAME}=1`,
    `Path=/`,
    `Max-Age=${DEMO_COOKIE_MAX_AGE}`,
    `SameSite=Lax`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Build the Set-Cookie header value for clearing the demo cookie.
 */
export function demoCookieClearHeader(): string {
  return `${DEMO_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Client-side helpers (for use in "use client" components — no server imports)
// ---------------------------------------------------------------------------

/**
 * Check if demo mode is active from within a browser context.
 * Reads the cookie directly from `document.cookie`.
 */
export function isDemoModeClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim() === `${DEMO_COOKIE_NAME}=1`);
}

/**
 * Set the demo cookie from client-side JS.
 */
export function setDemoCookieClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE_NAME}=1; Path=/; Max-Age=${DEMO_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Clear the demo cookie from client-side JS.
 */
export function clearDemoCookieClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function getDemoRoleClient(): DemoPortalRole {
  const role = getCookieValue(DEMO_ROLE_COOKIE_NAME);
  return role === "tenant" ? "tenant" : "owner";
}

export function setDemoRoleClient(role: DemoPortalRole): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_ROLE_COOKIE_NAME}=${role}; Path=/; Max-Age=${DEMO_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function getDemoTenantIdClient(): string | null {
  return getCookieValue(DEMO_TENANT_COOKIE_NAME);
}

export function setDemoTenantIdClient(tenantId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_TENANT_COOKIE_NAME}=${encodeURIComponent(tenantId)}; Path=/; Max-Age=${DEMO_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearDemoRoleClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_ROLE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function clearDemoTenantIdClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_TENANT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}
