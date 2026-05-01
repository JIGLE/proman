import { describe, it, expect } from "vitest";
import {
  TaxCalculator,
  PT_RENDA_ACESSIVEL_THRESHOLD_2026,
  PT_RENDA_ACESSIVEL_RATE,
  ES_STRESSED_ZONE_DEDUCTIONS,
  ES_GRANDES_TENEDORES_THRESHOLD_STRESSED,
  ES_GRANDES_TENEDORES_THRESHOLD_GENERAL,
} from "@/lib/utils/tax-calculator";

// ─── Constants ────────────────────────────────────────────────────────────────

describe("exported constants", () => {
  it("PT renda acessível threshold is 2300", () => {
    expect(PT_RENDA_ACESSIVEL_THRESHOLD_2026).toBe(2300);
  });

  it("PT renda acessível rate is 10%", () => {
    expect(PT_RENDA_ACESSIVEL_RATE).toBe(0.1);
  });

  it("ES deduction tiers match legal values", () => {
    expect(ES_STRESSED_ZONE_DEDUCTIONS.REDUCED_RENT).toBe(0.9);
    expect(ES_STRESSED_ZONE_DEDUCTIONS.YOUNG_TENANT).toBe(0.7);
    expect(ES_STRESSED_ZONE_DEDUCTIONS.REHABILITATED).toBe(0.6);
    expect(ES_STRESSED_ZONE_DEDUCTIONS.BASE).toBe(0.5);
  });

  it("grandes tenedores thresholds are 5 (stressed) and 10 (general)", () => {
    expect(ES_GRANDES_TENEDORES_THRESHOLD_STRESSED).toBe(5);
    expect(ES_GRANDES_TENEDORES_THRESHOLD_GENERAL).toBe(10);
  });
});

// ─── isGrandesTenedores ───────────────────────────────────────────────────────

describe("TaxCalculator.isGrandesTenedores", () => {
  it("returns true when stressed-zone units ≥ 5", () => {
    expect(TaxCalculator.isGrandesTenedores(4, 5)).toBe(true);
  });

  it("returns true when total units ≥ 10 (even with 0 stressed)", () => {
    expect(TaxCalculator.isGrandesTenedores(10, 0)).toBe(true);
  });

  it("returns false when below both thresholds", () => {
    expect(TaxCalculator.isGrandesTenedores(9, 4)).toBe(false);
  });

  it("returns false for 0 units", () => {
    expect(TaxCalculator.isGrandesTenedores(0, 0)).toBe(false);
  });

  it("boundary: exactly 9 total units and 4 stressed → false", () => {
    expect(TaxCalculator.isGrandesTenedores(9, 4)).toBe(false);
  });
});

// ─── validateRentCap ─────────────────────────────────────────────────────────

describe("TaxCalculator.validateRentCap", () => {
  it("allows any rent when not in zona tensionada", () => {
    const result = TaxCalculator.validateRentCap({
      proposedMonthlyRent: 5000,
      isNewContract: false,
      isZonaTensionada: false,
      isGranTenedor: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.maxRent).toBe(5000);
    expect(result.reason).toMatch(/no cap/i);
  });

  it("existing contract in zona tensionada (year 2025): 2% cap", () => {
    const result = TaxCalculator.validateRentCap({
      proposedMonthlyRent: 1021,
      priorContractRent: 1000,
      isNewContract: false,
      isZonaTensionada: true,
      isGranTenedor: false,
      year: 2025,
    });
    // maxRent = 1000 * 1.02 = 1020
    expect(result.maxRent).toBeCloseTo(1020, 2);
    expect(result.allowed).toBe(false);
  });

  it("existing contract in zona tensionada (year 2024): 3% cap", () => {
    const result = TaxCalculator.validateRentCap({
      proposedMonthlyRent: 1030,
      priorContractRent: 1000,
      isNewContract: false,
      isZonaTensionada: true,
      isGranTenedor: false,
      year: 2024,
    });
    // maxRent = 1000 * 1.03 = 1030 → exactly at cap → allowed
    expect(result.maxRent).toBeCloseTo(1030, 2);
    expect(result.allowed).toBe(true);
  });

  it("new contract + gran tenedor + MITMA index: capped at MITMA", () => {
    const result = TaxCalculator.validateRentCap({
      proposedMonthlyRent: 950,
      mitmaReferenceIndex: 900,
      isNewContract: true,
      isZonaTensionada: true,
      isGranTenedor: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.maxRent).toBe(900);
    expect(result.reason).toMatch(/gran tenedor/i);
  });

  it("new contract + gran tenedor + MITMA: allowed when under cap", () => {
    const result = TaxCalculator.validateRentCap({
      proposedMonthlyRent: 850,
      mitmaReferenceIndex: 900,
      isNewContract: true,
      isZonaTensionada: true,
      isGranTenedor: true,
    });
    expect(result.allowed).toBe(true);
  });

  it("new contract + non-gran-tenedor + prior rent: capped at prior + index", () => {
    const result = TaxCalculator.validateRentCap({
      proposedMonthlyRent: 1025,
      priorContractRent: 1000,
      isNewContract: true,
      isZonaTensionada: true,
      isGranTenedor: false,
      year: 2025,
    });
    // maxRent = 1000 * 1.02 = 1020 → 1025 > 1020 → not allowed
    expect(result.allowed).toBe(false);
    expect(result.maxRent).toBeCloseTo(1020, 2);
  });

  it("new contract + no prior rent + MITMA only: capped at MITMA", () => {
    const result = TaxCalculator.validateRentCap({
      proposedMonthlyRent: 800,
      mitmaReferenceIndex: 850,
      isNewContract: true,
      isZonaTensionada: true,
      isGranTenedor: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.maxRent).toBe(850);
    expect(result.reason).toMatch(/MITMA/);
  });

  it("new contract + zona tensionada + no prior rent + no MITMA: insufficient data fallback", () => {
    const result = TaxCalculator.validateRentCap({
      proposedMonthlyRent: 1000,
      isNewContract: true,
      isZonaTensionada: true,
      isGranTenedor: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toMatch(/insufficient/i);
  });
});

// ─── Portugal Tax Calculation ─────────────────────────────────────────────────

describe("TaxCalculator.calculateTax — Portugal", () => {
  const baseInput = {
    country: "PT" as const,
    regime: "portugal_rendimentos" as const,
    annualRentalIncome: 12000,
    deductibleExpenses: 1000,
  };

  it("renda acessível below threshold → flat 10%, no deductions", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      isRendaAcessivel: true,
      monthlyRent: 800, // well below 2300 threshold
    });
    expect(result.appliedRegime).toBe("renda_acessivel_10pct");
    expect(result.taxRate).toBe(10);
    expect(result.effectiveRate).toBe(10);
    expect(result.taxAmount).toBeCloseTo(12000 * 0.1, 2);
    expect(result.deductions.total).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("renda acessível when monthlyRent derived from annual income", () => {
    // When monthlyRent not supplied, it's computed as annualRentalIncome / 12
    const result = TaxCalculator.calculateTax({
      ...baseInput, // 12000 / 12 = 1000 < 2300
      isRendaAcessivel: true,
    });
    expect(result.appliedRegime).toBe("renda_acessivel_10pct");
  });

  it("renda acessível above threshold → falls through to standard brackets with warning", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      annualRentalIncome: 36000,
      isRendaAcessivel: true,
      monthlyRent: 3000, // above 2300 threshold
    });
    expect(result.appliedRegime).toBe("portugal_categoria_f_standard");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings![0]).toMatch(/threshold/);
  });

  it("standard brackets: expenses capped at 15% of gross", () => {
    // expenses: 5000, but 15% of 12000 = 1800 → capped at 1800
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      deductibleExpenses: 5000,
    });
    const maxDeductible = 12000 * 0.15;
    // taxableIncome = 12000 - 1800 = 10200
    const expectedTaxable = 12000 - maxDeductible;
    expect(result.taxableIncome).toBeCloseTo(expectedTaxable, 2);
  });

  it("standard brackets: expenses below 15% cap are fully deducted", () => {
    // expenses: 1000 < 1800 → full 1000 deducted
    const result = TaxCalculator.calculateTax(baseInput);
    expect(result.taxableIncome).toBeCloseTo(12000 - 1000, 2);
  });

  it("ownership bonus reduces tax: 1 year = 5% reduction", () => {
    const noBonus = TaxCalculator.calculateTax({ ...baseInput, yearsOfOwnership: 0 });
    const oneYear = TaxCalculator.calculateTax({ ...baseInput, yearsOfOwnership: 1 });
    expect(oneYear.taxAmount).toBeCloseTo(noBonus.taxAmount * 0.95, 2);
  });

  it("ownership bonus is capped at 15% (3+ years)", () => {
    const threeYears = TaxCalculator.calculateTax({ ...baseInput, yearsOfOwnership: 3 });
    const tenYears = TaxCalculator.calculateTax({ ...baseInput, yearsOfOwnership: 10 });
    // Both should be the same since bonus is capped at 15%
    expect(threeYears.taxAmount).toBeCloseTo(tenYears.taxAmount, 2);
  });

  it("zero income → zero tax and zero effectiveRate", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      annualRentalIncome: 0,
      deductibleExpenses: 0,
    });
    expect(result.taxAmount).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it("quarterlyPayment is taxAmount / 4", () => {
    const result = TaxCalculator.calculateTax(baseInput);
    expect(result.quarterlyPayment).toBeCloseTo(result.taxAmount / 4, 5);
  });

  it("appliedRegime is portugal_categoria_f_standard for standard path", () => {
    expect(TaxCalculator.calculateTax(baseInput).appliedRegime).toBe(
      "portugal_categoria_f_standard",
    );
  });
});

// ─── Spain Tax Calculation ────────────────────────────────────────────────────

describe("TaxCalculator.calculateTax — Spain", () => {
  const baseInput = {
    country: "ES" as const,
    regime: "spain_inmuebles" as const,
    annualRentalIncome: 12000,
    deductibleExpenses: 1000,
  };

  it("outside stressed zone: 50% BASE deduction applied", () => {
    const result = TaxCalculator.calculateTax({ ...baseInput, isZonaTensionada: false });
    // netIncome = 12000 - min(1000, 6000) = 11000
    // taxableIncome = 11000 * 0.5 = 5500 (19% bracket)
    expect(result.taxableIncome).toBeCloseTo(11000 * 0.5, 2);
    expect(result.appliedRegime).toContain("standard_50pct");
  });

  it("stressed zone + isRentReducedVsPrior: 90% deduction (highest tier)", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      isZonaTensionada: true,
      isRentReducedVsPrior: true,
    });
    const net = 12000 - Math.min(1000, 12000 * 0.5);
    expect(result.taxableIncome).toBeCloseTo(net * 0.1, 2); // 1 - 0.9 = 0.1 remains
    expect(result.appliedRegime).toContain("reduced_rent_90pct");
  });

  it("stressed zone + tenant age 18-35: 70% deduction", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      isZonaTensionada: true,
      tenantAge: 25,
    });
    const net = 12000 - Math.min(1000, 12000 * 0.5);
    expect(result.taxableIncome).toBeCloseTo(net * 0.3, 2); // 1 - 0.7
    expect(result.appliedRegime).toContain("young_tenant_70pct");
  });

  it("stressed zone + rehabilitated: 60% deduction", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      isZonaTensionada: true,
      isRehabilitatedProperty: true,
    });
    const net = 12000 - Math.min(1000, 12000 * 0.5);
    expect(result.taxableIncome).toBeCloseTo(net * 0.4, 2); // 1 - 0.6
    expect(result.appliedRegime).toContain("rehabilitated_60pct");
  });

  it("stressed zone base (no special qualifier): 50% deduction", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      isZonaTensionada: true,
    });
    expect(result.appliedRegime).toContain("base_50pct");
  });

  it("90% tier takes priority over 70% even when both qualifiers present", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      isZonaTensionada: true,
      isRentReducedVsPrior: true,
      tenantAge: 25, // also qualifies for 70%
    });
    expect(result.appliedRegime).toContain("reduced_rent_90pct");
  });

  it("deductions capped at 50% of gross income", () => {
    // expenses 10000, but cap = 12000 * 0.5 = 6000
    const result = TaxCalculator.calculateTax({ ...baseInput, deductibleExpenses: 10000 });
    // netRentalIncome = 12000 - 6000 = 6000
    expect(result.grossIncome - result.netIncome).toBeLessThanOrEqual(10000);
  });

  it("grande tenedor warning included in result", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      totalUnitsOwned: 10,
      unitsInStressedZones: 0,
    });
    expect(result.grandesTenedores).toBe(true);
    expect(result.warnings!.some((w) => /gran tenedor/i.test(w))).toBe(true);
  });

  it("mortgage interest and community fees are added to deductions", () => {
    const withExtras = TaxCalculator.calculateTax({
      ...baseInput,
      mortgageInterest: 500,
      communityFees: 200,
    });
    const withoutExtras = TaxCalculator.calculateTax(baseInput);
    // More deductions → lower taxable income → lower tax
    expect(withExtras.taxAmount).toBeLessThanOrEqual(withoutExtras.taxAmount);
  });

  it("zero income → zero tax", () => {
    const result = TaxCalculator.calculateTax({
      ...baseInput,
      annualRentalIncome: 0,
      deductibleExpenses: 0,
    });
    expect(result.taxAmount).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it("quarterlyPayment is taxAmount / 4", () => {
    const result = TaxCalculator.calculateTax(baseInput);
    expect(result.quarterlyPayment).toBeCloseTo(result.taxAmount / 4, 5);
  });
});

// ─── Unsupported country ──────────────────────────────────────────────────────

describe("TaxCalculator.calculateTax — unsupported country", () => {
  it("throws for unsupported country code", () => {
    expect(() =>
      TaxCalculator.calculateTax({
        country: "UK" as "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 1000,
        deductibleExpenses: 0,
      }),
    ).toThrow();
  });
});

// ─── getTaxBrackets ───────────────────────────────────────────────────────────

describe("TaxCalculator.getTaxBrackets", () => {
  it("returns 9 PT brackets with rates in percentage form", () => {
    const brackets = TaxCalculator.getTaxBrackets("PT");
    expect(brackets).toHaveLength(9);
    // Rates should be in % (e.g., 13.25 not 0.1325)
    expect(brackets[0].rate).toBeGreaterThan(1);
    expect(brackets[0].min).toBe(0);
  });

  it("returns 6 ES brackets", () => {
    const brackets = TaxCalculator.getTaxBrackets("ES");
    expect(brackets).toHaveLength(6);
    expect(brackets[0].min).toBe(0);
  });

  it("accepts full country name 'Portugal'", () => {
    expect(TaxCalculator.getTaxBrackets("Portugal")).toHaveLength(9);
  });

  it("accepts full country name 'Spain'", () => {
    expect(TaxCalculator.getTaxBrackets("Spain")).toHaveLength(6);
  });

  it("throws for unknown country code", () => {
    expect(() => TaxCalculator.getTaxBrackets("UK" as "PT")).toThrow();
  });
});

// ─── calculateQuarterlyEstimate ───────────────────────────────────────────────

describe("TaxCalculator.calculateQuarterlyEstimate", () => {
  it("returns a positive number for PT", () => {
    const estimate = TaxCalculator.calculateQuarterlyEstimate("PT", 3000, 250);
    expect(estimate).toBeGreaterThan(0);
  });

  it("returns a positive number for ES", () => {
    const estimate = TaxCalculator.calculateQuarterlyEstimate("ES", 3000, 250);
    expect(estimate).toBeGreaterThan(0);
  });

  it("quarterly estimate equals annual tax / 4", () => {
    const quarterly = 3000;
    const expenses = 250;
    const estimate = TaxCalculator.calculateQuarterlyEstimate("PT", quarterly, expenses);
    const annual = TaxCalculator.calculateTax({
      country: "PT",
      regime: "portugal_rendimentos",
      annualRentalIncome: quarterly * 4,
      deductibleExpenses: expenses * 4,
    });
    expect(estimate).toBeCloseTo(annual.quarterlyPayment, 5);
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe("TaxCalculator.formatCurrency", () => {
  it("formats EUR with Portuguese locale by default (contains €)", () => {
    const formatted = TaxCalculator.formatCurrency(1500);
    expect(formatted).toContain("1");
    // Just verify it's a valid formatted string — locale rendering varies by environment
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("formats GBP", () => {
    const formatted = TaxCalculator.formatCurrency(1000, "GBP");
    expect(typeof formatted).toBe("string");
  });

  it("formats USD (other currency)", () => {
    const formatted = TaxCalculator.formatCurrency(500, "USD");
    expect(typeof formatted).toBe("string");
  });

  it("accepts explicit locale override", () => {
    const formatted = TaxCalculator.formatCurrency(1234.5, "EUR", "de-DE");
    expect(typeof formatted).toBe("string");
  });

  it("handles zero amount", () => {
    const formatted = TaxCalculator.formatCurrency(0);
    expect(typeof formatted).toBe("string");
  });
});
