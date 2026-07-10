import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, isDemoRequestMock, createCheckoutSessionMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  isDemoRequestMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/demo/demo-mode", () => ({
  isDemoRequest: isDemoRequestMock,
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  createCheckoutSession: createCheckoutSessionMock,
}));

import { GET } from "./route";

describe("GET /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoRequestMock.mockReturnValue(false);
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
  });

  it("rejects a missing/invalid plan", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/billing/checkout"));
    expect(response.status).toBe(400);
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated visitors to sign-in with a callback", async () => {
    requireAuthMock.mockResolvedValue(new Response(null, { status: 401 }));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/billing/checkout?plan=pro"),
    );

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/auth/signin");
    expect(location).toContain(encodeURIComponent("/api/billing/checkout?plan=pro"));
  });

  it("redirects an authenticated user straight into Stripe Checkout", async () => {
    createCheckoutSessionMock.mockResolvedValue("https://checkout.stripe.com/session/abc");

    const response = await GET(
      new NextRequest("http://localhost:3000/api/billing/checkout?plan=pro"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/session/abc");
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      "user-123",
      "pro",
      expect.objectContaining({
        successUrl: expect.stringContaining("/settings?tab=billing&checkout=success"),
        cancelUrl: expect.stringContaining("/settings?tab=billing&checkout=canceled"),
      }),
      { trialDays: 14 },
    );
  });

  it("does not apply a trial to the Business plan", async () => {
    createCheckoutSessionMock.mockResolvedValue("https://checkout.stripe.com/session/def");

    await GET(new NextRequest("http://localhost:3000/api/billing/checkout?plan=business"));

    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      "user-123",
      "business",
      expect.anything(),
      { trialDays: undefined },
    );
  });

  it("redirects demo requests back to the referring page instead of Stripe", async () => {
    isDemoRequestMock.mockReturnValue(true);
    const request = new NextRequest("http://localhost:3000/api/billing/checkout?plan=pro", {
      headers: { referer: "http://localhost:3000/pt/settings" },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/pt/settings");
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns a 500 with the error message when Checkout Session creation fails", async () => {
    createCheckoutSessionMock.mockRejectedValue(new Error("STRIPE_PRICE_ID_PRO is not configured"));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/billing/checkout?plan=pro"),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("STRIPE_PRICE_ID_PRO is not configured");
  });
});
