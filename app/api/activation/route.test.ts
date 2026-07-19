import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, getActivationSummaryMock, getComplianceStreakMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  getActivationSummaryMock: vi.fn(),
  getComplianceStreakMock: vi.fn(),
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));

vi.mock("@/lib/services/database/database", () => ({
  getPrismaClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/analytics/activation-summary", () => ({
  getActivationSummary: getActivationSummaryMock,
  getComplianceStreak: getComplianceStreakMock,
}));

import { GET } from "./route";

describe("GET /api/activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    getComplianceStreakMock.mockResolvedValue({ streakMonths: 0, hasHistory: false });
  });

  it("returns the authenticated user's own activation summary plus compliance streak", async () => {
    getActivationSummaryMock.mockResolvedValue({
      userId: "user-123",
      isActivated: false,
      firstPropertyAt: null,
      firstTenantAt: null,
      firstLeaseAt: null,
      firstPaidReceiptAt: null,
      activatedAt: null,
    });
    getComplianceStreakMock.mockResolvedValue({ streakMonths: 4, hasHistory: true });

    const response = await GET(new NextRequest("http://localhost:3000/api/activation"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getActivationSummaryMock).toHaveBeenCalledWith(expect.anything(), "user-123");
    expect(getComplianceStreakMock).toHaveBeenCalledWith(expect.anything(), "user-123");
    expect(body.data.userId).toBe("user-123");
    expect(body.data.complianceStreak).toEqual({ streakMonths: 4, hasHistory: true });
  });

  it("returns the auth failure response when unauthenticated", async () => {
    const unauthorized = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    requireAuthMock.mockResolvedValue(unauthorized);

    const response = await GET(new NextRequest("http://localhost:3000/api/activation"));

    expect(response.status).toBe(401);
    expect(getActivationSummaryMock).not.toHaveBeenCalled();
    expect(getComplianceStreakMock).not.toHaveBeenCalled();
  });
});
