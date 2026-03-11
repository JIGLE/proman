import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, logAuditMock, getPrismaClientMock } = vi.hoisted(
  () => ({
    requireAdminMock: vi.fn(),
    logAuditMock: vi.fn(),
    getPrismaClientMock: vi.fn(),
  }),
);

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/services/audit-log", () => ({
  logAudit: logAuditMock,
}));

vi.mock("@/lib/services/database/database", () => ({
  getPrismaClient: getPrismaClientMock,
}));

import { GET } from "@/app/api/admin/database/route";

describe("GET /api/admin/database", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    getPrismaClientMock.mockReturnValue({
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "user-1",
            email: "alice@example.com",
            name: "Alice",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      },
      property: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "property-1",
            name: "Sunset Villas",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      },
    });

    logAuditMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("logs admin database access with scoped metadata and returns data", async () => {
    requireAdminMock.mockResolvedValue({
      userId: "admin-1",
      session: { user: { role: "ADMIN" } },
    });

    const request = new NextRequest(
      "http://localhost/api/admin/database?view=all",
      {
        method: "GET",
        headers: {
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "vitest-agent",
        },
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.tables).toContain("User");
    expect(payload.data.User[0].email).toBe("al***@example.com");

    expect(logAuditMock).toHaveBeenCalledTimes(1);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-1",
        action: "DATABASE_ACCESS",
        resourceType: "AdminDatabaseView",
        details: expect.objectContaining({
          scope: expect.objectContaining({
            perTableLimit: 50,
          }),
          request: expect.objectContaining({
            method: "GET",
            path: "/api/admin/database",
            query: "?view=all",
          }),
          metadata: expect.objectContaining({
            ipAddress: "203.0.113.10",
            userAgent: "vitest-agent",
          }),
        }),
      }),
    );
  });

  it("returns auth response directly when admin check fails and does not log audit", async () => {
    requireAdminMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new NextRequest("http://localhost/api/admin/database", {
      method: "GET",
    });

    const response = await GET(request);
    expect(response.status).toBe(403);
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  it("continues serving data when audit logging fails", async () => {
    requireAdminMock.mockResolvedValue({
      userId: "admin-2",
      session: { user: { role: "ADMIN" } },
    });
    logAuditMock.mockRejectedValueOnce(new Error("audit storage unavailable"));

    const request = new NextRequest("http://localhost/api/admin/database", {
      method: "GET",
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.tables).toContain("Property");
    expect(Array.isArray(payload.data.Property)).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
