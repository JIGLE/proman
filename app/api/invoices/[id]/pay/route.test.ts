import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Marking an invoice paid is a money-state transition with no tested engine behind it — the
 * route is the logic. These cover the wiring: scoping, the not-found mapping, validation, and
 * that free-text reaching the database goes through sanitizeForDatabase (deliberately NOT
 * mocked, so a regression in the real sanitizer surfaces here).
 */

const { requireAuthMock, markAsPaidMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  markAsPaidMock: vi.fn(),
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/invoice-service", () => ({
  invoiceService: { markAsPaid: markAsPaidMock },
}));

import { POST } from "./route";

const payRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/invoices/inv-1/pay", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const context = { params: { id: "inv-1" } };

describe("POST /api/invoices/[id]/pay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    markAsPaidMock.mockResolvedValue({ id: "inv-1", status: "paid" });
  });

  it("marks the invoice paid and passes the caller's own id through", async () => {
    const res = await POST(
      payRequest({ paymentMethod: "bank_transfer", referenceNumber: "REF-99" }),
      context,
    );

    expect(res.status).toBe(200);
    expect(markAsPaidMock).toHaveBeenCalledWith("user-123", "inv-1", "bank_transfer", "REF-99");
  });

  it("strips HTML from free-text fields before they reach the service", async () => {
    await POST(
      payRequest({ paymentMethod: "<script>alert(1)</script>transfer", referenceNumber: "REF-1" }),
      context,
    );

    const [, , paymentMethod] = markAsPaidMock.mock.calls[0];
    expect(paymentMethod).not.toContain("<");
    expect(paymentMethod).not.toContain("script");
  });

  it("returns 404 when the service reports the invoice does not exist", async () => {
    // Scoping lives in the service; the route's job is mapping that to 404 rather than 500,
    // and not distinguishing "absent" from "someone else's".
    markAsPaidMock.mockRejectedValue(new Error("Invoice not found"));

    const res = await POST(payRequest({}), context);

    expect(res.status).toBe(404);
  });

  it("returns 400 when a field exceeds its length limit", async () => {
    const res = await POST(payRequest({ paymentMethod: "x".repeat(101) }), context);

    expect(res.status).toBe(400);
    expect(markAsPaidMock).not.toHaveBeenCalled();
  });

  it("returns 400 when no invoice id is supplied", async () => {
    const res = await POST(payRequest({}), { params: {} });

    expect(res.status).toBe(400);
    expect(markAsPaidMock).not.toHaveBeenCalled();
  });

  it("tolerates an empty body — payment details are optional", async () => {
    const res = await POST(
      new NextRequest("http://localhost:3000/api/invoices/inv-1/pay", { method: "POST" }),
      context,
    );

    expect(res.status).toBe(200);
    expect(markAsPaidMock).toHaveBeenCalledWith("user-123", "inv-1", undefined, undefined);
  });
});
