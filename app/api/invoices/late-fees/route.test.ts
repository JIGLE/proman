import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Applying late fees mutates money across every overdue invoice at once, driven entirely by a
 * config the caller supplies. The default-config branch is the one worth pinning: an empty body
 * silently applies a 5% fee after a 5-day grace period, so a change to those numbers should
 * break a test rather than quietly re-price everyone's arrears.
 */

const { requireAuthMock, applyLateFeesMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  applyLateFeesMock: vi.fn(),
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/invoice-service", () => ({
  invoiceService: { applyLateFees: applyLateFeesMock },
}));

import { POST } from "./route";

const lateFeeRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/invoices/late-fees", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

describe("POST /api/invoices/late-fees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    applyLateFeesMock.mockResolvedValue([]);
  });

  it("applies the documented defaults when the body is empty", async () => {
    const res = await POST(lateFeeRequest({}));

    expect(res.status).toBe(200);
    expect(applyLateFeesMock).toHaveBeenCalledWith("user-123", {
      enabled: true,
      gracePeriodDays: 5,
      percentageRate: 5,
      flatFee: 0,
      maxPercentage: 25,
    });
  });

  it("uses a supplied config in place of the defaults", async () => {
    await POST(
      lateFeeRequest({
        enabled: true,
        gracePeriodDays: 10,
        percentageRate: 2,
        flatFee: 15,
        maxPercentage: 20,
      }),
    );

    expect(applyLateFeesMock).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ gracePeriodDays: 10, percentageRate: 2, flatFee: 15 }),
    );
  });

  it("scopes the run to the authenticated user", async () => {
    requireAuthMock.mockResolvedValue({ userId: "user-999" });

    await POST(lateFeeRequest({}));

    expect(applyLateFeesMock).toHaveBeenCalledWith("user-999", expect.anything());
  });

  it("reports how many invoices were touched", async () => {
    applyLateFeesMock.mockResolvedValue([
      {
        id: "inv-1",
        number: "2026-001",
        originalAmount: 1000,
        lateFee: 50,
        amount: 1050,
        tenantName: "Ana Costa",
        propertyName: "Rua Augusta 12",
      },
    ]);

    const res = await POST(lateFeeRequest({}));

    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ count: 1 }),
      }),
    );
  });

  it("returns 400 for a malformed config rather than applying anything", async () => {
    const res = await POST(lateFeeRequest({ percentageRate: "not-a-number" }));

    expect(res.status).toBe(400);
    expect(applyLateFeesMock).not.toHaveBeenCalled();
  });
});
