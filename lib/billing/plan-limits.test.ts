import { describe, it, expect } from "vitest";
import { getPlanLimits, PLAN_LIMITS } from "./plan-limits";

describe("getPlanLimits", () => {
  it("limits Free to 1 property", () => {
    expect(getPlanLimits("free")).toEqual({ maxProperties: 1, maxSeats: 1 });
  });

  it("limits Pro to 10 properties", () => {
    expect(getPlanLimits("pro")).toEqual({ maxProperties: 10, maxSeats: 1 });
  });

  it("gives Business unlimited properties", () => {
    expect(getPlanLimits("business")).toEqual({ maxProperties: null, maxSeats: 5 });
  });

  it("covers exactly the three marketed plans", () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(["business", "free", "pro"]);
  });
});
