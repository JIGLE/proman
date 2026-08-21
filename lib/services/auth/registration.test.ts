import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The hole these cases exist for, stated once so it cannot be re-opened by accident:
 *
 * The OAuth `signIn` callback ended in an unconditional `return true`, and the JWT callback
 * provisioned every new identity with `role: "ADMIN"`. A publicly reachable instance — which a
 * live bank connection requires, since the provider must reach the consent callback — handed an
 * administrator account to anyone who clicked "Sign in with Google".
 *
 * `decideSignIn` is pure so the policy can be enumerated exhaustively here without a database.
 * `resolveSignIn` is the thin part that reads one; its only interesting property is that it fails
 * closed, which is the case a mocked Prisma can prove and a live one cannot.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));

import { allowedEmails, decideSignIn, resolveSignIn } from "./registration";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AUTH_ALLOWED_EMAILS;
});

afterEach(() => {
  delete process.env.AUTH_ALLOWED_EMAILS;
});

describe("the registration policy", () => {
  const base = { email: "someone@example.org", allowed: [] as string[] };

  it("lets an existing user sign in, as it always did", () => {
    // The common case by far, and the one that must never regress: locking registration must not
    // lock out the person who already owns the instance.
    expect(decideSignIn({ ...base, userExists: true, totalUsers: 1 })).toEqual({
      allow: true,
      reason: "existing_user",
    });
  });

  it("admits the very first account, so a fresh install can be claimed", () => {
    // Bootstrap needs no configuration — requiring an env var to create the first account would
    // mean an operator locked out of a brand-new instance with no way in.
    expect(decideSignIn({ ...base, userExists: false, totalUsers: 0 })).toEqual({
      allow: true,
      reason: "bootstrap",
    });
  });

  it("REFUSES a stranger once an account exists", () => {
    // The whole point. Revert the gate in auth.ts and this is the assertion that goes red.
    expect(decideSignIn({ ...base, userExists: false, totalUsers: 1 })).toEqual({
      allow: false,
      reason: "registration_closed",
    });
  });

  it("admits an explicitly allowlisted email", () => {
    expect(
      decideSignIn({
        email: "partner@example.org",
        userExists: false,
        totalUsers: 1,
        allowed: ["partner@example.org"],
      }),
    ).toEqual({ allow: true, reason: "allowlisted" });
  });

  it("matches the allowlist case-insensitively and ignores stray spacing", () => {
    // Emails are not case-sensitive in practice, and a value pasted into a config field arrives
    // with whatever whitespace came with it. Neither should silently deny a legitimate person.
    process.env.AUTH_ALLOWED_EMAILS = " Partner@Example.ORG , second@example.org ";
    expect(allowedEmails()).toEqual(["partner@example.org", "second@example.org"]);

    expect(
      decideSignIn({
        email: "  PARTNER@example.org ",
        userExists: false,
        totalUsers: 3,
        allowed: allowedEmails(),
      }).allow,
    ).toBe(true);
  });

  it("treats an unset or blank allowlist as nobody extra, not everybody", () => {
    // A split on "" yields [""], which would match an empty email. Worth pinning: the failure
    // would be silent and would open the instance rather than close it.
    expect(allowedEmails()).toEqual([]);
    process.env.AUTH_ALLOWED_EMAILS = "   ,  ,";
    expect(allowedEmails()).toEqual([]);
  });
});

describe("resolving the policy against the database", () => {
  it("refuses when the database cannot be read", async () => {
    // Fails CLOSED. An outage must not become an unauthenticated-signup window — which is exactly
    // what a `catch { return true }` here would produce, and it would never be noticed.
    prismaMock.user.findUnique.mockRejectedValue(new Error("database is locked"));
    prismaMock.user.count.mockRejectedValue(new Error("database is locked"));

    await expect(resolveSignIn("someone@example.org")).rejects.toThrow();
  });

  it("reads both the user and the total, and admits the owner", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
    prismaMock.user.count.mockResolvedValue(1);

    await expect(resolveSignIn("owner@example.org")).resolves.toEqual({
      allow: true,
      reason: "existing_user",
    });
  });

  it("refuses an unknown email on a claimed instance", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.count.mockResolvedValue(1);

    await expect(resolveSignIn("stranger@example.org")).resolves.toEqual({
      allow: false,
      reason: "registration_closed",
    });
  });
});
