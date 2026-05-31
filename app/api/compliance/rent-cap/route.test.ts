import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, logAuditMock, isGrandesTenedoresMock, validateRentCapMock } = vi.hoisted(
  () => ({
    requireAuthMock: vi.fn(),
    logAuditMock: vi.fn(),
    isGrandesTenedoresMock: vi.fn(),
    validateRentCapMock: vi.fn(),
  }),
);

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/services/audit-log", () => ({
  logAudit: logAuditMock,
}));

vi.mock("@/lib/services/tax-calculator", () => ({
  TaxCalculator: {
    isGrandesTenedores: isGrandesTenedoresMock,
    validateRentCap: validateRentCapMock,
  },
}));

import { POST } from "./route";

describe("Compliance rent cap route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-999" });
    logAuditMock.mockResolvedValue(undefined);
    isGrandesTenedoresMock.mockReturnValue(false);
    validateRentCapMock.mockReturnValue({ isValid: true, allowedMaxRent: 1200 });
  });

  it("audits invalid proposedMonthlyRent requests", async () => {
    const request = new NextRequest("http://localhost:3000/api/compliance/rent-cap", {
      method: "POST",
      body: JSON.stringify({ proposedMonthlyRent: 0 }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-999",
        action: "VALIDATE_RENT_CAP",
        resourceType: "RentCapValidation",
      }),
    );
  });

  it("audits successful rent cap validations", async () => {
    const request = new NextRequest("http://localhost:3000/api/compliance/rent-cap", {
      method: "POST",
      body: JSON.stringify({
        proposedMonthlyRent: 1000,
        priorContractRent: 950,
        mitmaReferenceIndex: 980,
        isZonaTensionada: true,
        totalUnitsOwned: 2,
        unitsInStressedZones: 1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-999",
        action: "VALIDATE_RENT_CAP",
        resourceType: "RentCapValidation",
      }),
    );
  });
});
