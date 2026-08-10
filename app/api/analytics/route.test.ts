import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Query params get the same treatment as bodies: an out-of-range ?months or an unknown
 * ?type is the caller's mistake and returns 400. The route used to call
 * analyticsRequestSchema.parse() directly, so the ZodError surfaced as a 500.
 */

const { requireAuthMock, analyticsServiceMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  analyticsServiceMock: {
    getDashboardAnalytics: vi.fn(),
    getKPIMetrics: vi.fn(),
  },
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/analytics-service", () => ({ analyticsService: analyticsServiceMock }));

import { GET } from "./route";

const get = (qs = "") => new NextRequest(`http://localhost:3000/api/analytics${qs}`);

describe("GET /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    analyticsServiceMock.getDashboardAnalytics.mockResolvedValue({ totalRevenue: 0 });
  });

  it("defaults to the dashboard view when no params are given", async () => {
    const res = await GET(get());

    expect(res.status).toBe(200);
    expect(analyticsServiceMock.getDashboardAnalytics).toHaveBeenCalledWith("user-123");
  });

  it("returns 400 for an unknown analytics type", async () => {
    const res = await GET(get("?type=not-a-real-type"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringContaining("Validation error") }),
    );
    expect(analyticsServiceMock.getDashboardAnalytics).not.toHaveBeenCalled();
  });

  it("returns 400 when months is outside the supported range", async () => {
    // The schema caps months at 24; asking for 999 is a bad request, not a server fault.
    const res = await GET(get("?months=999"));

    expect(res.status).toBe(400);
    expect(analyticsServiceMock.getDashboardAnalytics).not.toHaveBeenCalled();
  });
});
