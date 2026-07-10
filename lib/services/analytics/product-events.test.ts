import { describe, it, expect, vi } from "vitest";
import { recordProductEvent } from "./product-events";

function makePrisma(createImpl: (...args: unknown[]) => unknown) {
  return { productEvent: { create: vi.fn(createImpl) } } as unknown as Parameters<
    typeof recordProductEvent
  >[0];
}

describe("recordProductEvent", () => {
  it("writes a row with JSON-stringified metadata", async () => {
    const create = vi.fn().mockResolvedValue({});
    const prisma = { productEvent: { create } } as unknown as Parameters<
      typeof recordProductEvent
    >[0];

    await recordProductEvent(prisma, "user-1", "reminder_clicked", { type: "payment_due" });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "reminder_clicked",
        metadata: JSON.stringify({ type: "payment_due" }),
      },
    });
  });

  it("writes null metadata when none is given", async () => {
    const create = vi.fn().mockResolvedValue({});
    const prisma = { productEvent: { create } } as unknown as Parameters<
      typeof recordProductEvent
    >[0];

    await recordProductEvent(prisma, "user-1", "reminder_clicked");

    expect(create).toHaveBeenCalledWith({
      data: { userId: "user-1", name: "reminder_clicked", metadata: null },
    });
  });

  it("never throws when the write fails", async () => {
    const prisma = makePrisma(() => Promise.reject(new Error("db down")));

    await expect(recordProductEvent(prisma, "user-1", "reminder_clicked")).resolves.toBeUndefined();
  });
});
