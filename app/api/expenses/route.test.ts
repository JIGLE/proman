import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Pins the validation contract: a malformed body is a 400 the caller can act on, not a 500.
 * The route used to call expenseSchema.parse() directly, so the ZodError reached
 * withErrorHandler — which has no ZodError branch and reports everything as 500.
 */

const { requireAuthMock, prismaMock, handleDemoMutationMock, handleDemoGetMock } = vi.hoisted(
  () => ({
    requireAuthMock: vi.fn(),
    prismaMock: { expense: { create: vi.fn(), findMany: vi.fn() } },
    handleDemoMutationMock: vi.fn(),
    handleDemoGetMock: vi.fn(),
  }),
);

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/config/data-mode", () => ({ isMockMode: false }));
vi.mock("@/lib/demo/demo-api-handler", () => ({
  handleDemoGet: handleDemoGetMock,
  handleDemoMutation: handleDemoMutationMock,
}));

import { POST } from "./route";

const postRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/expenses", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const validExpense = {
  propertyId: "prop-1",
  amount: 120.5,
  date: "2026-03-01",
  category: "repairs",
};

describe("POST /api/expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleDemoGetMock.mockReturnValue({ response: null });
    handleDemoMutationMock.mockResolvedValue({ response: null });
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    prismaMock.expense.create.mockResolvedValue({
      id: "exp-1",
      amount: 120.5,
      property: { name: "Rua Augusta 12" },
    });
  });

  it("creates an expense from a valid body", async () => {
    const res = await POST(postRequest(validExpense));

    expect(res.status).toBe(201);
    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ propertyId: "prop-1", userId: "user-123" }),
      }),
    );
  });

  it("returns 400 when the category is not a known one", async () => {
    const res = await POST(postRequest({ ...validExpense, category: "not-a-category" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringContaining("Invalid category") }),
    );
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it("returns 400 when the amount is zero or negative", async () => {
    const res = await POST(postRequest({ ...validExpense, amount: 0 }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.stringContaining("Amount must be greater than 0"),
      }),
    );
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });
});
