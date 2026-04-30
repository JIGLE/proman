import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthMock,
  logAuditMock,
  listOwnershipVerificationsMock,
  createOwnershipVerificationMock,
} = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  logAuditMock: vi.fn(),
  listOwnershipVerificationsMock: vi.fn(),
  createOwnershipVerificationMock: vi.fn(),
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/services/audit-log", () => ({
  logAudit: logAuditMock,
}));

vi.mock("@/lib/services/verification/ownership-verification", () => ({
  listOwnershipVerifications: listOwnershipVerificationsMock,
  createOwnershipVerification: createOwnershipVerificationMock,
}));

import { GET, POST } from "./route";

describe("Ownership verifications route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    logAuditMock.mockResolvedValue(undefined);
    listOwnershipVerificationsMock.mockResolvedValue([]);
  });

  it("filters verification listings by authenticated user and query params", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/ownership-verifications?provider=financas&status=pending&propertyId=prop-1",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(listOwnershipVerificationsMock).toHaveBeenCalledWith("user-123", {
      provider: "financas",
      status: "pending",
      propertyId: "prop-1",
      scope: undefined,
    });
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        action: "VIEW_OWNERSHIP_VERIFICATIONS",
        resourceType: "GovernmentVerification",
      }),
    );
  });

  it("creates a new ownership verification request for the authenticated user", async () => {
    createOwnershipVerificationMock.mockResolvedValue({
      id: "verification-1",
      provider: "financas",
      scope: "property_ownership",
      propertyClaims: [{ id: "claim-1" }],
    });

    const request = new NextRequest("http://localhost:3000/api/ownership-verifications", {
      method: "POST",
      body: JSON.stringify({
        provider: "financas",
        scope: "property_ownership",
        propertyClaims: [
          {
            propertyId: "prop-1",
            claimType: "ownership",
            ownershipPercentage: 100,
          },
        ],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createOwnershipVerificationMock).toHaveBeenCalledWith("user-123", {
      provider: "financas",
      scope: "property_ownership",
      propertyClaims: [
        {
          propertyId: "prop-1",
          claimType: "ownership",
          ownershipPercentage: 100,
        },
      ],
    });
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        action: "CREATE_OWNERSHIP_VERIFICATION",
        resourceId: "verification-1",
      }),
    );
  });
});
