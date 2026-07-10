import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { findUniqueMock, sendInvitationMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  sendInvitationMock: vi.fn(),
}));

vi.mock("@/lib/services/database/database", () => ({
  getPrismaClient: () => ({
    tenant: { findUnique: findUniqueMock },
  }),
}));

vi.mock("@/lib/services/auth/tenant-portal-auth", () => ({
  tenantPortalService: { sendInvitation: sendInvitationMock },
}));

import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/tenant-portal/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tenant-portal/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a fresh invitation when the email matches a tenant", async () => {
    findUniqueMock.mockResolvedValue({ id: "tenant-1", userId: "user-1" });
    sendInvitationMock.mockResolvedValue({ success: true });

    const response = await POST(makeRequest({ email: "tenant@example.com" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sent).toBe(true);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "tenant@example.com" },
      select: { id: true, userId: true },
    });
    expect(sendInvitationMock).toHaveBeenCalledWith("tenant-1", "user-1");
  });

  it("returns the same generic success response when no tenant matches (no enumeration)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ email: "nobody@example.com" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sent).toBe(true);
    expect(sendInvitationMock).not.toHaveBeenCalled();
  });

  it("lowercases the email before lookup", async () => {
    findUniqueMock.mockResolvedValue(null);

    await POST(makeRequest({ email: "Tenant@Example.COM" }));

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "tenant@example.com" },
      select: { id: true, userId: true },
    });
  });

  it("rejects an invalid email with a 400", async () => {
    const response = await POST(makeRequest({ email: "not-an-email" }));

    expect(response.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects a missing body with a 400", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenant-portal/resend", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
