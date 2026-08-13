import { describe, it, expect } from "vitest";
import { round2, sumMoney, MONEY_EPSILON } from "@/lib/utils/money";

describe("money helpers", () => {
  it("sumMoney fixes the drift a naive reduce produces", () => {
    const twelveMonths = Array(12).fill(1250.1);
    const naive = twelveMonths.reduce((a, b) => a + b, 0);
    expect(naive).not.toBe(15001.2);
    expect(sumMoney(twelveMonths)).toBe(15001.2);
  });

  it("the classic case", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it("round2 rounds to cents", () => {
    expect(round2(0.30000000000000004)).toBe(0.3);
    expect(round2(1250.005)).toBe(1250.01);
  });

  it("empty sum is zero, not NaN", () => {
    expect(sumMoney([])).toBe(0);
  });

  it("MONEY_EPSILON is half a cent", () => {
    expect(MONEY_EPSILON).toBe(0.005);
  });
});
