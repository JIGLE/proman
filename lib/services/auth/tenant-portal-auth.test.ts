import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

/**
 * Portal tokens are bearer credentials: whoever holds one reads that tenant's invoices, documents
 * and payment history without a session. Verification compared the HMAC with `!==`, which
 * short-circuits at the first differing byte and leaks how many leading bytes matched — enough,
 * given patience, to build a valid signature one byte at a time.
 *
 * These pin that the comparison goes through the constant-time helper the rest of the codebase
 * already uses, and that the surrounding checks (expiry, tenant binding) still hold.
 */

const { prismaMock, timingSafeEqualStringMock } = vi.hoisted(() => ({
  prismaMock: { tenant: { findUnique: vi.fn(), updateMany: vi.fn() } },
  timingSafeEqualStringMock: vi.fn(),
}));

vi.mock("../database/database", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/utils/security", () => ({
  timingSafeEqualString: timingSafeEqualStringMock,
}));

import { revokePortalAccess, verifyPortalToken } from "./tenant-portal-auth";

const SECRET = "test-secret-should-be-long-enough-for-dev";

function makeToken(payload: Record<string, unknown>, secret = SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

const validPayload = () => ({
  tenantId: "tenant-1",
  userId: "user-123",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
});

describe("verifyPortalToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = SECRET;
    prismaMock.tenant.findUnique.mockResolvedValue({ id: "tenant-1", userId: "user-123" });
    // Behave like the real helper by default.
    timingSafeEqualStringMock.mockImplementation((a: string, b: string) => a === b);
  });

  it("accepts a correctly signed, unexpired token", async () => {
    const result = await verifyPortalToken(makeToken(validPayload()));

    expect(result).toMatchObject({ tenantId: "tenant-1", userId: "user-123" });
  });

  it("compares the signature with the constant-time helper, not ===", async () => {
    // The assertion that matters: a plain string comparison would never reach this mock.
    await verifyPortalToken(makeToken(validPayload()));

    expect(timingSafeEqualStringMock).toHaveBeenCalledTimes(1);
    const [supplied, expected] = timingSafeEqualStringMock.mock.calls[0];
    expect(supplied).toEqual(expected);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const forged = makeToken(validPayload(), "attacker-secret-attacker-secret-xx");

    await expect(verifyPortalToken(forged)).resolves.toBeNull();
  });

  it("rejects a tampered payload, since the signature no longer matches", async () => {
    const token = makeToken(validPayload());
    const [header, , signature] = token.split(".");
    const swapped = Buffer.from(
      JSON.stringify({ ...validPayload(), tenantId: "tenant-victim" }),
    ).toString("base64url");

    await expect(verifyPortalToken(`${header}.${swapped}.${signature}`)).resolves.toBeNull();
  });

  it("rejects an expired token even when the signature is valid", async () => {
    const expired = makeToken({ ...validPayload(), exp: Math.floor(Date.now() / 1000) - 60 });

    await expect(verifyPortalToken(expired)).resolves.toBeNull();
  });

  it("rejects a token whose tenant no longer belongs to the issuing user", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: "tenant-1", userId: "someone-else" });

    await expect(verifyPortalToken(makeToken(validPayload()))).resolves.toBeNull();
  });

  it("rejects a malformed token without attempting a comparison", async () => {
    await expect(verifyPortalToken("not-a-token")).resolves.toBeNull();
    expect(timingSafeEqualStringMock).not.toHaveBeenCalled();
  });
});

/**
 * Revocation.
 *
 * Before this, a portal link could not be withdrawn: the tokens are stateless, so a link
 * forwarded to the wrong address — or one belonging to a tenant who had moved out — kept
 * working until it expired on its own, up to seven days later.
 *
 * Worse than absent, `tenantPortalService.revokeAccess` EXISTED and was a stub: it took a
 * tenantId, ignored it, and returned `{ success: true }`. A caller would report success to a
 * landlord while every outstanding link stayed live. That is the same fabricated-success shape
 * as the tax connector's D1 finding, applied to access control.
 */
describe("portal access revocation", () => {
  const REVOKED_AT = new Date("2026-06-15T12:00:00.000Z");
  /** Seconds, as `iat` is stored. */
  const at = (d: Date) => Math.floor(d.getTime() / 1000);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = SECRET;
    timingSafeEqualStringMock.mockImplementation((a: string, b: string) => a === b);
  });

  it("refuses a token issued before the revocation", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      userId: "user-123",
      portalAccessRevokedAt: REVOKED_AT,
    });
    const token = makeToken({
      ...validPayload(),
      iat: at(new Date(REVOKED_AT.getTime() - 60_000)),
    });

    expect(await verifyPortalToken(token)).toBeNull();
  });

  it("accepts a token issued after the revocation, so a fresh link still works", async () => {
    // Revoking must not lock the tenant out permanently — the owner regenerates and the new
    // link works. Without this case, "reject everything" would pass the test above.
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      userId: "user-123",
      portalAccessRevokedAt: REVOKED_AT,
    });
    const token = makeToken({
      ...validPayload(),
      iat: at(new Date(REVOKED_AT.getTime() + 60_000)),
    });

    expect(await verifyPortalToken(token)).not.toBeNull();
  });

  it("refuses a token issued in the same second as the revocation", async () => {
    // `iat` is whole seconds, the column is milliseconds, so this instant is ambiguous. It is
    // refused deliberately: over-rejecting costs the owner one click, under-rejecting leaves
    // the link they just revoked working.
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      userId: "user-123",
      portalAccessRevokedAt: REVOKED_AT,
    });
    const token = makeToken({ ...validPayload(), iat: at(REVOKED_AT) });

    expect(await verifyPortalToken(token)).toBeNull();
  });

  it("leaves tokens alone when nothing was ever revoked", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      userId: "user-123",
      portalAccessRevokedAt: null,
    });

    expect(await verifyPortalToken(makeToken(validPayload()))).not.toBeNull();
  });

  it("scopes the revoking write to the caller's own tenant", async () => {
    prismaMock.tenant.updateMany.mockResolvedValue({ count: 1 });

    await revokePortalAccess("tenant-1", "user-123");

    // userId in the WHERE is what stops one landlord revoking another's tenant. The route
    // passes it from the session, never from the request body.
    const [[call]] = prismaMock.tenant.updateMany.mock.calls;
    expect(call.where).toEqual({ id: "tenant-1", userId: "user-123" });
    expect(call.data.portalAccessRevokedAt).toBeInstanceOf(Date);
  });

  it("reports false when the tenant is not the caller's, rather than throwing", async () => {
    prismaMock.tenant.updateMany.mockResolvedValue({ count: 0 });

    // The route turns this into a 404, so probing another landlord's tenant id cannot confirm
    // it exists.
    expect(await revokePortalAccess("someone-elses-tenant", "user-123")).toBe(false);
  });
});
