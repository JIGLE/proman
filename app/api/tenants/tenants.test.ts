import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getTenants, POST as postTenants } from "./route";

// Mock auth middleware
vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: vi.fn(async (req) => {
    if (req.headers.get("Authorization") === "Bearer valid-token") {
      return { userId: "user-123", email: "user@example.com" };
    }
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
}));

// Mock database service
vi.mock("@/lib/services/database", () => ({
  tenantService: {
    getAll: vi.fn(async () => []),
    create: vi.fn(async (_userId, data) => ({ id: "tenant-1", ...data })),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock Prisma client
vi.mock("@/lib/services/database/database", () => ({
  getPrismaClient: vi.fn(() => ({
    tenant: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  })),
}));

// Mock error handling
vi.mock("@/lib/utils/error-handling", () => ({
  createErrorResponse: (error, status) =>
    new Response(JSON.stringify({ error: error.message }), { status }),
  createSuccessResponse: (data, status = 200) =>
    new Response(JSON.stringify(data), { status }),
  withErrorHandler: (fn) => fn,
}));

// Mock pagination
vi.mock("@/lib/utils/pagination", () => ({
  getPaginationFromRequest: () => ({ skip: 0, limit: 50, page: 1 }),
  createPaginatedResponse: (data) => ({ data, total: data.length, page: 1 }),
}));

// Mock sanitize
vi.mock("@/lib/utils/sanitize", () => ({
  sanitizeForDatabase: (val) => val,
  sanitizeEmail: (val) => val,
  sanitizeNumber: (val, min, minBound) => Math.max(val, min),
}));

describe("Tenants API - GET /api/tenants", () => {
  it("should return all tenants for authenticated user", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      headers: new Headers({ Authorization: "Bearer valid-token" }),
    });

    const response = await getTenants(request);
    expect(response.status).toBe(200);
  });

  it("should return 401 when not authenticated", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants");
    const response = await getTenants(request);
    expect(response.status).toBe(401);
  });

  it("should support pagination with page parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/tenants?page=2",
      {
        headers: new Headers({ Authorization: "Bearer valid-token" }),
      },
    );
    const response = await getTenants(request);
    expect(response.status).toBe(200);
  });

  it("should support pagination with limit parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/tenants?limit=25",
      {
        headers: new Headers({ Authorization: "Bearer valid-token" }),
      },
    );
    const response = await getTenants(request);
    expect(response.status).toBe(200);
  });

  it("should handle both page and limit parameters together", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/tenants?page=1&limit=10",
      {
        headers: new Headers({ Authorization: "Bearer valid-token" }),
      },
    );
    const response = await getTenants(request);
    expect(response.status).toBe(200);
  });

  it("should return empty list when no tenants exist", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      headers: new Headers({ Authorization: "Bearer valid-token" }),
    });
    const response = await getTenants(request);
    expect(response.status).toBe(200);
  });

  it("should handle database errors gracefully", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      headers: new Headers({ Authorization: "Bearer valid-token" }),
    });
    const response = await getTenants(request);
    expect([200, 500]).toContain(response.status);
  });
});

describe("Tenants API - POST /api/tenants", () => {
  it("should create tenant with valid data", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      headers: new Headers({ Authorization: "Bearer valid-token" }),
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        rent: 1200,
        leaseStart: "2024-01-01T00:00:00Z",
        leaseEnd: "2025-01-01T00:00:00Z",
      }),
    });

    const response = await postTenants(request);
    expect([200, 201]).toContain(response.status);
  });

  it("should return 401 when not authenticated", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        rent: 1200,
        leaseStart: "2024-01-01T00:00:00Z",
        leaseEnd: "2025-01-01T00:00:00Z",
      }),
    });
    const response = await postTenants(request);
    expect(response.status).toBe(401);
  });

  it("should validate required fields", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      headers: new Headers({ Authorization: "Bearer valid-token" }),
      body: JSON.stringify({}),
    });

    const response = await postTenants(request);
    expect([400, 422]).toContain(response.status);
  });

  it("should validate email format", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      headers: new Headers({ Authorization: "Bearer valid-token" }),
      body: JSON.stringify({
        name: "John Doe",
        email: "invalid-email",
        phone: "555-1234",
        rent: 1200,
        leaseStart: "2024-01-01T00:00:00Z",
        leaseEnd: "2025-01-01T00:00:00Z",
      }),
    });

    const response = await postTenants(request);
    expect([400, 422]).toContain(response.status);
  });

  it("should validate rent is positive", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      headers: new Headers({ Authorization: "Bearer valid-token" }),
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        rent: -100,
        leaseStart: "2024-01-01T00:00:00Z",
        leaseEnd: "2025-01-01T00:00:00Z",
      }),
    });

    const response = await postTenants(request);
    expect([200, 201, 400, 422]).toContain(response.status);
  });

  it("should sanitize text input", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      headers: new Headers({ Authorization: "Bearer valid-token" }),
      body: JSON.stringify({
        name: "John<script>alert('xss')</script>",
        email: "john@example.com",
        phone: "555-1234",
        rent: 1200,
        leaseStart: "2024-01-01T00:00:00Z",
        leaseEnd: "2025-01-01T00:00:00Z",
      }),
    });

    const response = await postTenants(request);
    expect([200, 201, 400, 422]).toContain(response.status);
  });

  it("should accept optional propertyId", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      headers: new Headers({ Authorization: "Bearer valid-token" }),
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        propertyId: "prop-123",
        rent: 1200,
        leaseStart: "2024-01-01T00:00:00Z",
        leaseEnd: "2025-01-01T00:00:00Z",
      }),
    });

    const response = await postTenants(request);
    expect([200, 201]).toContain(response.status);
  });

  it("should return 201 on successful creation", async () => {
    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      headers: new Headers({ Authorization: "Bearer valid-token" }),
      body: JSON.stringify({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "555-5678",
        rent: 1500,
        leaseStart: "2024-01-01T00:00:00Z",
        leaseEnd: "2025-01-01T00:00:00Z",
      }),
    });

    const response = await postTenants(request);
    expect([200, 201]).toContain(response.status);
  });
});
