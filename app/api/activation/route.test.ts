import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, getActivationSummaryMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  getActivationSummaryMock: vi.fn(),
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));

vi.mock("@/lib/services/analytics/activation-summary", () => ({
  getActivationSummary: getActivationSummaryMock,
}));

import { GET } from "./route";

describe("GET /api/activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
  });

  it("returns the authenticated user's own activation summary", async () => {
    getActivationSummaryMock.mockResolvedValue({
      userId: "user-123",
      isActivated: false,
      firstPropertyAt: null,
      firstTenantAt: null,
      firstLeaseAt: null,
      firstPaidReceiptAt: null,
      activatedAt: null,
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/activation"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getActivationSummaryMock).toHaveBeenCalledWith(expect.anything(), "user-123");
    expect(body.data.userId).toBe("user-123");
  });

  it("returns the auth failure response when unauthenticated", async () => {
    const unauthorized = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    requireAuthMock.mockResolvedValue(unauthorized);

    const response = await GET(new NextRequest("http://localhost:3000/api/activation"));

    expect(response.status).toBe(401);
    expect(getActivationSummaryMock).not.toHaveBeenCalled();
  });
});
