import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, listRentReceiptsMock, createRentReceiptMock, logAuditMock } = vi.hoisted(
  () => ({
    requireAuthMock: vi.fn(),
    listRentReceiptsMock: vi.fn(),
    createRentReceiptMock: vi.fn(),
    logAuditMock: vi.fn(),
  }),
);

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/compliance/rent-receipts-pt", () => ({
  listRentReceipts: listRentReceiptsMock,
  createRentReceipt: createRentReceiptMock,
}));

vi.mock("@/lib/services/audit-log", () => ({
  logAudit: logAuditMock,
}));

import { GET, POST } from "./route";

describe("Compliance rent receipts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-321" });
    logAuditMock.mockResolvedValue(undefined);
  });

  it("audits GET /api/compliance/rent-receipts", async () => {
    listRentReceiptsMock.mockResolvedValue({ receipts: [], total: 0, page: 1, limit: 50 });

    const request = new NextRequest(
      "http://localhost:3000/api/compliance/rent-receipts?status=draft",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("audits POST /api/compliance/rent-receipts including failed creation details", async () => {
    createRentReceiptMock.mockResolvedValue({
      success: false,
      errors: ["Validation failed"],
    });

    const request = new NextRequest("http://localhost:3000/api/compliance/rent-receipts", {
      method: "POST",
      body: JSON.stringify({
        tenantId: "c12345678901234567890",
        propertyId: "c22345678901234567890",
        landlordNif: "123456789",
        paymentDate: "2026-01-01T00:00:00Z",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T00:00:00Z",
        // Required fields for validation
        propertyAddress: "Rua Exemplo 1, Lisboa",
        rentAmount: 1000,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-321",
        action: "CREATE_RENT_RECEIPT",
        resourceType: "RentReceipt",
      }),
    );
  });
});
