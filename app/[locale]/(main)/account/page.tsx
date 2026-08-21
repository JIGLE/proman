import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Account is now the first section of Settings rather than a page of its own.
 *
 * It had been a read-only shadow of what Settings already owned — its Security card showed the
 * 2FA state and then linked to `/settings?tab=security` for the actual control. Only the audit
 * trail was unique, and that moved across with it.
 *
 * `normalizePortalPath` maps `/account` → `/settings` so `canAccessPortalPath` still permits
 * this URL for both roles; the redirect below is what a visitor actually follows.
 */
export default async function AccountPage() {
  redirect("/settings?tab=account");
}
