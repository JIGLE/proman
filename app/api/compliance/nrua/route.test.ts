import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthMock, getPrismaClientMock, exportLeaseToNRUAMock, logAuditMock } = vi.hoisted(
  () => ({
    requireAuthMock: vi.fn(),
    getPrismaClientMock: vi.fn(),
    exportLeaseToNRUAMock: vi.fn(),
    logAuditMock: vi.fn(),
  }),
);

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/services/database/database", () => ({
  getPrismaClient: getPrismaClientMock,
}));

vi.mock("@/lib/compliance/nrua-export", () => ({
  exportLeaseToNRUA: exportLeaseToNRUAMock,
  validateNifNie: vi.fn(() => true),
}));

vi.mock("@/lib/services/audit-log", () => ({
  logAudit: logAuditMock,
}));

import { GET, POST } from "./route";

describe("Compliance NRUA route", () => {
  const findManyMock = vi.fn();
  const countMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);
    getPrismaClientMock.mockReturnValue({
      nRUARegistration: {
        findMany: findManyMock,
        count: countMock,
      },
    });
    logAuditMock.mockResolvedValue(undefined);
  });

  it("scopes GET /api/compliance/nrua to the authenticated user's lease or property", async () => {
    const request = new NextRequest("http://localhost:3000/api/compliance/nrua?page=2&limit=10");

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ lease: { userId: "user-123" } }, { property: { userId: "user-123" } }],
        },
        skip: 10,
        take: 10,
      }),
    );
    expect(countMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ lease: { userId: "user-123" } }, { property: { userId: "user-123" } }],
        },
      }),
    );
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        action: "VIEW_NRUA_REGISTRATIONS",
        resourceType: "NRUARegistration",
      }),
    );
  });

  it("passes authenticated userId into NRUA export and preserves forbidden status", async () => {
    exportLeaseToNRUAMock.mockResolvedValue({
      success: false,
      errors: ["Forbidden: You do not own this lease or property"],
      status: 403,
    });

    const request = new NextRequest("http://localhost:3000/api/compliance/nrua", {
      method: "POST",
      body: JSON.stringify({
        leaseId: "c12345678901234567890",
        landlordNif: "12345678Z",
        landlordName: "Owner Name",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(exportLeaseToNRUAMock).toHaveBeenCalledWith(
      "c12345678901234567890",
      "12345678Z",
      "Owner Name",
      "user-123",
    );
    expect(response.status).toBe(403);
    expect(payload.details).toEqual(["Forbidden: You do not own this lease or property"]);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        action: "EXPORT_NRUA_REGISTRATION",
        resourceType: "Lease",
        resourceId: "c12345678901234567890",
      }),
    );
  });
});
