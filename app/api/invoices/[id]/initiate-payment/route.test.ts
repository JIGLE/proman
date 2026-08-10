import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The largest untested handler in the app and the only one that talks to Stripe. Two assertions
 * here are worth more than the rest combined: that the amount handed to the payment provider is
 * in cents (a regression charges 100x or 1/100th), and that an already-paid invoice is refused
 * (a regression double-charges a tenant). The rest pin scoping and the refusal branches.
 */

const {
  requireAuthMock,
  prismaMock,
  paymentServiceMock,
  portugalPaymentServiceMock,
  spainPaymentServiceMock,
} = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  prismaMock: { invoice: { findUnique: vi.fn() } },
  paymentServiceMock: { isReady: vi.fn(), createPaymentIntent: vi.fn() },
  portugalPaymentServiceMock: {
    createMultibancoPayment: vi.fn(),
    formatMultibancoReference: vi.fn(() => "123 456 789"),
    formatAmountPT: vi.fn(() => "€1.234,50"),
    validatePortuguesePhone: vi.fn(() => true),
  },
  spainPaymentServiceMock: { formatAmountES: vi.fn(() => "1.234,50 €") },
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({ requireAuth: requireAuthMock }));
vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/payment/payment-service", () => ({ paymentService: paymentServiceMock }));
vi.mock("@/lib/payment/methods/portugal", () => ({
  portugalPaymentService: portugalPaymentServiceMock,
}));
vi.mock("@/lib/payment/methods/spain", () => ({ spainPaymentService: spainPaymentServiceMock }));

import { POST } from "./route";

const initiate = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/invoices/inv-1/initiate-payment", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const context = { params: Promise.resolve({ id: "inv-1" }) };

const invoice = {
  id: "inv-1",
  userId: "user-123",
  tenantId: "tenant-1",
  number: "2026-001",
  amount: 1234.5,
  status: "pending",
  tenant: { id: "tenant-1", name: "Ana Costa", userId: "user-123" },
};

describe("POST /api/invoices/[id]/initiate-payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    prismaMock.invoice.findUnique.mockResolvedValue(invoice);
    paymentServiceMock.isReady.mockReturnValue(true);
    paymentServiceMock.createPaymentIntent.mockResolvedValue({
      success: true,
      clientSecret: "pi_secret",
    });
    portugalPaymentServiceMock.validatePortuguesePhone.mockReturnValue(true);
  });

  it("converts the invoice amount to integer cents for the payment provider", async () => {
    const res = await POST(initiate({ paymentMethodType: "card" }), context);

    expect(res.status).toBe(200);
    // 1234.50 EUR must reach Stripe as 123450, not 1234.5 and not 1234.
    expect(paymentServiceMock.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 123450, currency: "EUR", invoiceId: "inv-1" }),
    );
  });

  it("rounds a float amount rather than truncating it", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ ...invoice, amount: 19.99 });

    await POST(initiate({ paymentMethodType: "card" }), context);

    expect(paymentServiceMock.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1999 }),
    );
  });

  it("refuses to start a payment for an already-paid invoice", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ ...invoice, status: "paid" });

    const res = await POST(initiate({ paymentMethodType: "card" }), context);

    expect(res.status).toBe(400);
    expect(paymentServiceMock.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("refuses a cancelled invoice", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ ...invoice, status: "cancelled" });

    const res = await POST(initiate({ paymentMethodType: "card" }), context);

    expect(res.status).toBe(400);
    expect(paymentServiceMock.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("returns 404, not 403, for an invoice belonging to someone else", async () => {
    // Answering 403 would confirm the invoice exists to a stranger who guessed its id.
    prismaMock.invoice.findUnique.mockResolvedValue({
      ...invoice,
      userId: "user-999",
      tenant: { id: "tenant-9", name: "Someone Else", userId: "user-999" },
    });

    const res = await POST(initiate({ paymentMethodType: "card" }), context);

    expect(res.status).toBe(404);
    expect(paymentServiceMock.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("returns 404 for an invoice that does not exist", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    const res = await POST(initiate({ paymentMethodType: "card" }), context);

    expect(res.status).toBe(404);
  });

  it("returns 503 when Stripe is not configured", async () => {
    paymentServiceMock.isReady.mockReturnValue(false);

    const res = await POST(initiate({ paymentMethodType: "card" }), context);

    expect(res.status).toBe(503);
    expect(paymentServiceMock.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("returns 400 for an unsupported payment method", async () => {
    const res = await POST(initiate({ paymentMethodType: "cheque" }), context);

    expect(res.status).toBe(400);
    expect(paymentServiceMock.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("routes Multibanco to the Portugal service with the cents amount", async () => {
    portugalPaymentServiceMock.createMultibancoPayment.mockResolvedValue({
      success: true,
      multibancoReference: "123456789",
    });

    const res = await POST(initiate({ paymentMethodType: "multibanco", country: "PT" }), context);

    expect(res.status).toBe(200);
    expect(portugalPaymentServiceMock.createMultibancoPayment).toHaveBeenCalledWith(
      "tenant-1",
      123450,
      "inv-1",
      expect.stringContaining("2026-001"),
    );
    expect(paymentServiceMock.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("requires a phone number for MB WAY", async () => {
    const res = await POST(initiate({ paymentMethodType: "mbway", country: "PT" }), context);

    expect(res.status).toBe(400);
  });

  it("rejects a malformed Portuguese phone for MB WAY", async () => {
    portugalPaymentServiceMock.validatePortuguesePhone.mockReturnValue(false);

    const res = await POST(
      initiate({ paymentMethodType: "mbway", country: "PT", mbwayPhone: "12345" }),
      context,
    );

    expect(res.status).toBe(400);
  });

  it("surfaces a provider failure as 400 rather than a success", async () => {
    paymentServiceMock.createPaymentIntent.mockResolvedValue({
      success: false,
      error: "card declined",
    });

    const res = await POST(initiate({ paymentMethodType: "card" }), context);

    expect(res.status).toBe(400);
  });
});
