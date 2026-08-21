import { describe, it, expect } from "vitest";

import { canAccessPortalPath, normalizePortalPath } from "./access";

/**
 * `normalizePortalPath` used to take `segments[1]`, hardcoding the assumption that a language
 * segment came first. That was true while every URL was `/pt/portfolio` and false the moment the
 * address bar lost the prefix — and because `canAccessPortalPath` derives access from its result,
 * getting it wrong does not misroute, it DENIES. A silent lockout of every page.
 *
 * Both shapes are exercised here because both exist during the migration: the proxy 308s a
 * prefixed URL to the clean one, but the app's own hrefs still emit prefixes until they are
 * migrated, and server code sees the rewritten (prefixed) path either way.
 */
describe("normalising a portal path", () => {
  it("resolves the same destination with and without a locale", () => {
    // The property this file exists for. If these ever disagree, one of the two URL shapes is
    // denied access to a page the other can reach.
    for (const [prefixed, clean] of [
      ["/en/portfolio", "/portfolio"],
      ["/pt/settings", "/settings"],
      ["/es/admin", "/admin"],
      ["/it/operations", "/operations"],
    ]) {
      expect(normalizePortalPath(prefixed)).toBe(normalizePortalPath(clean));
    }
  });

  it("keeps only the first destination segment", () => {
    // Detail routes normalise to their section, which is what makes `/admin/users` reachable
    // through the `/admin` nav entry without listing every child.
    expect(normalizePortalPath("/en/admin/users")).toBe("/admin");
    expect(normalizePortalPath("/admin/users")).toBe("/admin");
    expect(normalizePortalPath("/portfolio/abc123")).toBe("/portfolio");
  });

  it("treats a bare root as the dashboard, prefixed or not", () => {
    expect(normalizePortalPath("/")).toBe("/dashboard");
    expect(normalizePortalPath("/en")).toBe("/dashboard");
    expect(normalizePortalPath("")).toBe("/dashboard");
  });

  it("does not mistake a destination for a locale", () => {
    // The failure mode of a naive "strip the first segment" fix: a section whose name is two
    // letters would be eaten. None exists today, which is exactly why it would go unnoticed.
    expect(normalizePortalPath("/people")).toBe("/people");
    expect(normalizePortalPath("/it")).toBe("/dashboard"); // a real locale, correctly stripped
    expect(normalizePortalPath("/is/something")).toBe("/is"); // not a supported locale
  });

  it("still applies the legacy route aliases", () => {
    // These predate the prefix change and must survive it — old deep links depend on them.
    expect(normalizePortalPath("/en/properties")).toBe("/portfolio");
    expect(normalizePortalPath("/properties")).toBe("/portfolio");
    expect(normalizePortalPath("/reports")).toBe("/intelligence");
    expect(normalizePortalPath("/maintenance")).toBe("/operations");
  });
});

describe("access derived from the normalised path", () => {
  it("grants an owner the same pages under either URL shape", () => {
    for (const path of ["/portfolio", "/settings", "/admin", "/operations"]) {
      expect(canAccessPortalPath("owner", path)).toBe(true);
      expect(canAccessPortalPath("owner", `/en${path}`)).toBe(true);
    }
  });

  it("keeps a tenant out of owner-only pages under either shape", () => {
    // The regression that would matter most: if the clean shape resolved to something a tenant
    // may reach, the prefix change would become a privilege escalation.
    //
    // These are owner-only. `/portfolio`, `/financials`, `/documents` and `/leases` are NOT —
    // a tenant reaches their own view of each — which is why they are asserted below instead.
    for (const path of ["/admin", "/admin/users", "/operations", "/intelligence", "/contacts"]) {
      expect(canAccessPortalPath("tenant", path)).toBe(false);
      expect(canAccessPortalPath("tenant", `/en${path}`)).toBe(false);
    }
  });

  it("lets a tenant reach the pages that are theirs, under either shape", () => {
    for (const path of ["/settings", "/portfolio", "/documents", "/leases"]) {
      expect(canAccessPortalPath("tenant", path)).toBe(true);
      expect(canAccessPortalPath("tenant", `/pt${path}`)).toBe(true);
    }
  });
});
