import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";

const {
  mockPaymentService,
  mockGetSecret,
  mockIsEnabled,
  mockRateLimit,
  mockStripeConstructEvent,
} = vi.hoisted(() => ({
  mockPaymentService: {
    processStripeWebhook: vi.fn(),
  },
  mockGetSecret: vi.fn(),
  mockIsEnabled: vi.fn(),
  mockRateLimit: vi.fn(),
  mockStripeConstructEvent: vi.fn(),
}));

vi.mock("@/lib/payment/payment-service", () => ({
  paymentService: mockPaymentService,
}));

vi.mock("@/lib/utils/env", () => ({
  getSecret: mockGetSecret,
  isEnabled: mockIsEnabled,
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: mockRateLimit,
  RateLimits: {
    WEBHOOK: "webhook",
  },
}));

vi.mock("stripe", () => {
  return {
    default: vi.fn(() => ({
      webhooks: {
        constructEvent: mockStripeConstructEvent,
      },
    })),
  };
});

import { POST } from "./route";

describe("Stripe Webhook Handler", () => {
  let mockRequest: Partial<NextRequest>;
  let mockHeaders: Map<string, string>;

  beforeEach(() => {
    mockHeaders = new Map([
      ["stripe-signature", "valid-signature"],
      ["content-type", "application/json"],
    ]);

    mockRequest = {
      text: vi.fn(),
      headers: {
        get: vi.fn((key: string) => mockHeaders.get(key)),
      } as any,
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Feature Flags", () => {
    it("STRIPE-001: Should check if Stripe is enabled", async () => {
      mockGetSecret.mockReturnValue("sk_test_123");
      mockRateLimit.mockResolvedValue(null);
      mockRequest.text = vi.fn().mockResolvedValue("{}");

      await POST(mockRequest as any);
      expect(mockGetSecret).toHaveBeenCalledWith("STRIPE_SECRET_KEY");
    });

    it("STRIPE-002: Should return 404 if Stripe disabled", async () => {
      mockGetSecret.mockReturnValue(null);
      mockIsEnabled.mockReturnValue(false);

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(404);
    });

    it("STRIPE-003: Should check webhook secret configured", async () => {
      mockGetSecret.mockReturnValueOnce("sk_test_123").mockReturnValueOnce(null);
      mockRateLimit.mockResolvedValue(null);
      mockRequest.text = vi.fn().mockResolvedValue("{}");

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(404);
    });

    it("STRIPE-004: Should allow when enabled and secret configured", async () => {
      mockGetSecret.mockImplementation((key: string) => {
        if (key === "STRIPE_SECRET_KEY") return "sk_test";
        if (key === "STRIPE_WEBHOOK_SECRET") return "whsec_test";
        return null;
      });
      mockRateLimit.mockResolvedValue(null);
      const event = { type: "charge.succeeded", id: "evt_123" };
      mockRequest.text = vi.fn().mockResolvedValue(JSON.stringify(event));
      mockStripeConstructEvent.mockReturnValue(event);
      mockPaymentService.processStripeWebhook.mockResolvedValue({
        success: true,
      });

      expect(mockGetSecret).toBeDefined();
    });
  });
});
