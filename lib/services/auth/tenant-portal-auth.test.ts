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
  prismaMock: { tenant: { findUnique: vi.fn() } },
  timingSafeEqualStringMock: vi.fn(),
}));

vi.mock("../database/database", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/utils/security", () => ({
  timingSafeEqualString: timingSafeEqualStringMock,
}));

import { verifyPortalToken } from "./tenant-portal-auth";

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
