import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getCoreLoopMetricsMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCoreLoopMetricsMock: vi.fn(),
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAdmin: requireAdminMock,
  handleOptions: vi.fn(),
}));

vi.mock("@/lib/services/analytics/activation-summary", () => ({
  getCoreLoopMetrics: getCoreLoopMetricsMock,
}));

import { GET } from "./route";

describe("GET /api/admin/core-loop-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ userId: "admin-1", session: { user: { role: "ADMIN" } } });
  });

  it("returns aggregate core-loop metrics for an admin", async () => {
    getCoreLoopMetricsMock.mockResolvedValue({
      activeLandlords: 10,
      activatedLandlords: 4,
      receiptsPaidLast30Days: 20,
      rentReceiptsIssuedLast30Days: 5,
      reminderClicksLast30Days: 3,
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/core-loop-metrics"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.activeLandlords).toBe(10);
    expect(body.data.activatedLandlords).toBe(4);
  });

  it("rejects non-admins", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    requireAdminMock.mockResolvedValue(forbidden);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/core-loop-metrics"),
    );

    expect(response.status).toBe(403);
    expect(getCoreLoopMetricsMock).not.toHaveBeenCalled();
  });
});
