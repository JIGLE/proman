import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { ResourceNotFoundError } from "@/lib/utils/error-handling";

/**
 * Copying is the liability boundary — the moment responsibility for a template's wording moves
 * from the product to the landlord. It is a separate endpoint precisely so that crossing it is
 * deliberate; a fork that happened as a side effect of clicking "Edit" would not be a boundary.
 */

const { requireAuthMock, templateServiceMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  templateServiceMock: { copyForUser: vi.fn() },
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/database/correspondence", () => ({
  templateService: templateServiceMock,
}));

import { POST } from "./route";

const context = { params: Promise.resolve({ id: "tpl-statutory" }) };
const request = () =>
  new NextRequest("http://localhost:3000/api/correspondence/templates/tpl-statutory/copy", {
    method: "POST",
  });

describe("POST /api/correspondence/templates/[id]/copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    templateServiceMock.copyForUser.mockResolvedValue({
      id: "tpl-copy",
      name: "Opposition to renewal (copy)",
      isSystem: false,
      derivedFromId: "tpl-statutory",
      derivedFromVersion: 7,
    });
  });

  it("returns the fork with 201 and its lineage intact", async () => {
    const res = await POST(request(), context);

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      data: expect.objectContaining({
        isSystem: false,
        derivedFromId: "tpl-statutory",
        derivedFromVersion: 7,
      }),
    });
  });

  it("copies on behalf of the caller, not whoever owns the source", async () => {
    await POST(request(), context);

    expect(templateServiceMock.copyForUser).toHaveBeenCalledWith("user-123", "tpl-statutory");
  });

  it("returns 404 for a template the caller cannot see", async () => {
    templateServiceMock.copyForUser.mockRejectedValue(new ResourceNotFoundError("Template"));

    const res = await POST(request(), context);

    expect(res.status).toBe(404);
  });

  it("returns 400 when no id is supplied", async () => {
    const res = await POST(request(), { params: Promise.resolve({}) } as never);

    expect(res.status).toBe(400);
    expect(templateServiceMock.copyForUser).not.toHaveBeenCalled();
  });
});
