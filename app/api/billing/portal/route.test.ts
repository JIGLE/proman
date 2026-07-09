import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, isDemoRequestMock, createBillingPortalSessionMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  isDemoRequestMock: vi.fn(),
  createBillingPortalSessionMock: vi.fn(),
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/demo/demo-mode", () => ({
  isDemoRequest: isDemoRequestMock,
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  createBillingPortalSession: createBillingPortalSessionMock,
}));

import { GET } from "./route";

describe("GET /api/billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoRequestMock.mockReturnValue(false);
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
  });

  it("returns the auth failure response when unauthenticated", async () => {
    const unauthorized = new Response(null, { status: 401 });
    requireAuthMock.mockResolvedValue(unauthorized);

    const response = await GET(new NextRequest("http://localhost:3000/api/billing/portal"));

    expect(response.status).toBe(401);
    expect(createBillingPortalSessionMock).not.toHaveBeenCalled();
  });

  it("redirects to the Stripe Billing Portal", async () => {
    createBillingPortalSessionMock.mockResolvedValue("https://billing.stripe.com/session/xyz");

    const response = await GET(new NextRequest("http://localhost:3000/api/billing/portal"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://billing.stripe.com/session/xyz");
    expect(createBillingPortalSessionMock).toHaveBeenCalledWith(
      "user-123",
      expect.stringContaining("/settings?tab=billing"),
    );
  });

  it("redirects demo requests back to the referring page instead of Stripe", async () => {
    isDemoRequestMock.mockReturnValue(true);
    const request = new NextRequest("http://localhost:3000/api/billing/portal", {
      headers: { referer: "http://localhost:3000/pt/settings" },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/pt/settings");
    expect(createBillingPortalSessionMock).not.toHaveBeenCalled();
  });

  it("returns a 400 with the error message when no billing account exists", async () => {
    createBillingPortalSessionMock.mockRejectedValue(
      new Error("No billing account found for this user"),
    );

    const response = await GET(new NextRequest("http://localhost:3000/api/billing/portal"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("No billing account found for this user");
  });
});
