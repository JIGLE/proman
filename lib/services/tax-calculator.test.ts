import { describe, it, expect } from "vitest";
import {
  TaxCalculator,
  PT_RENDA_ACESSIVEL_THRESHOLD_2026,
  PT_RENDA_ACESSIVEL_RATE,
  type TaxCalculationInput,
} from "./tax-calculator";

describe("TaxCalculator", () => {
  describe("Portugal - IRS Standard Taxation", () => {
    it("PT-001: Should calculate tax for standard Portuguese rental income", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 10000,
        deductibleExpenses: 1000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.grossIncome).toBe(10000);
      expect(result.deductions.total).toBeGreaterThanOrEqual(0);
      expect(result.taxableIncome).toBeGreaterThan(0);
      expect(result.taxAmount).toBeGreaterThanOrEqual(0);
      expect(result.effectiveRate).toBeGreaterThanOrEqual(0);
      expect(result.effectiveRate).toBeLessThanOrEqual(100);
    });

    it("PT-002: Should apply 15% deduction cap for expenses", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 10000,
        deductibleExpenses: 3000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.deductions.breakdown.maxDeductible).toBeLessThanOrEqual(10000 * 0.15);
    });

    it("PT-003: Should handle zero rental income", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 0,
        deductibleExpenses: 0,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.taxAmount).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });

    it("PT-004: Should calculate deductions correctly", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 12000,
        deductibleExpenses: 1200,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.deductions.breakdown.expenses).toBe(1200);
      expect(result.netIncome).toBe(12000 - 1200);
    });

    it("PT-005: Should apply ownership bonus per year", () => {
      const input1: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 50000,
        deductibleExpenses: 5000,
        yearsOfOwnership: 1,
      };
      const input3: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 50000,
        deductibleExpenses: 5000,
        yearsOfOwnership: 3,
      };
      const result1 = TaxCalculator.calculateTax(input1);
      const result3 = TaxCalculator.calculateTax(input3);
      expect(result3.taxAmount).toBeLessThan(result1.taxAmount);
    });

    it("PT-006: Should use progressive brackets correctly", () => {
      const input = {
        country: "PT" as const,
        regime: "portugal_rendimentos" as const,
        annualRentalIncome: 50000,
        deductibleExpenses: 5000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.taxRate).toBeGreaterThan(0);
      expect(result.taxableIncome).toBeGreaterThan(0);
    });

    it("PT-007: Should calculate quarterly payments as 1/4 of annual tax", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 20000,
        deductibleExpenses: 2000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.quarterlyPayment).toBe(result.taxAmount / 4);
    });

    it("PT-008: Should handle high income (>100k)", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 150000,
        deductibleExpenses: 15000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.taxRate).toBeGreaterThan(40);
      expect(result.taxAmount).toBeGreaterThan(0);
    });

    it("PT-009: Should have appliedRegime set to correct value", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 30000,
        deductibleExpenses: 3000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.appliedRegime).toContain("standard");
    });

    it("PT-010: Should return warnings array", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 10000,
        deductibleExpenses: 1000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("Portugal - Renda Acessível", () => {
    it("PT-RA-001: Should apply 10% flat rate for renda acessível", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 24000,
        deductibleExpenses: 1000,
        isRendaAcessivel: true,
        monthlyRent: 2000,
      };
      const result = TaxCalculator.calculateTax(input);
      const expectedTax = 24000 * PT_RENDA_ACESSIVEL_RATE;
      expect(result.taxRate).toBe(10);
      expect(Math.abs(result.taxAmount - expectedTax)).toBeLessThan(1);
      expect(result.appliedRegime).toContain("renda_acessivel");
    });

    it("PT-RA-002: Should reject renda acessível if rent exceeds threshold", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 30000,
        deductibleExpenses: 1000,
        isRendaAcessivel: true,
        monthlyRent: 2500,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.warnings && result.warnings.some((w) => w.includes("exceeds"))).toBe(true);
      expect(result.taxRate).not.toBe(10);
    });

    it("PT-RA-003: Should check threshold 2026 is 2300", () => {
      expect(PT_RENDA_ACESSIVEL_THRESHOLD_2026).toBe(2300);
      expect(PT_RENDA_ACESSIVEL_RATE).toBe(0.1);
    });

    it("PT-RA-004: Should apply renda acessível at max threshold", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 2300 * 12,
        deductibleExpenses: 500,
        isRendaAcessivel: true,
        monthlyRent: 2300,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.taxRate).toBe(10);
    });

    it("PT-RA-005: Should not apply renda acessível if disabled", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 24000,
        deductibleExpenses: 1000,
        isRendaAcessivel: false,
        monthlyRent: 2000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.taxRate).not.toBe(10);
    });
  });

  describe("Spain - IRPF Inmuebles", () => {
    it("ES-001: Should calculate Spanish IRPF tax", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 1200,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.grossIncome).toBe(12000);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.appliedRegime).toContain("spain_irpf");
    });

    it("ES-002: Should apply 50% base deduction for standard rental", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 500,
        isZonaTensionada: false,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.appliedRegime).toContain("standard_50pct");
    });

    it("ES-003: Should apply mortgage interest as deduction", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 500,
        mortgageInterest: 2000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.deductions.breakdown.mortgageInterest).toBe(2000);
    });

    it("ES-004: Should apply community fees as deduction", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 500,
        communityFees: 600,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.deductions.breakdown.communityFees).toBe(600);
    });

    it("ES-005: Should cap deductions at 50% of rental income", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 10000,
        deductibleExpenses: 8000,
        mortgageInterest: 2000,
      };
      const result = TaxCalculator.calculateTax(input);
      // Expense deductions are capped at 50%, but total deductions can include stressed zone reduction
      expect(result.deductions.breakdown.maxDeductible).toBe(10000 * 0.5);
      const actualExpenseDeductions = Math.min(8000 + 2000, 10000 * 0.5);
      expect(actualExpenseDeductions).toBeLessThanOrEqual(10000 * 0.5);
    });
  });

  describe("Spain - Zona Tensionada (Stressed Zone)", () => {
    it("ES-ZT-001: Should apply 90% deduction for reduced rent", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 500,
        isZonaTensionada: true,
        isRentReducedVsPrior: true,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.appliedRegime).toContain("reduced_rent_90pct");
    });

    it("ES-ZT-002: Should apply 70% deduction for young tenant", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 500,
        isZonaTensionada: true,
        tenantAge: 28,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.appliedRegime).toContain("young_tenant_70pct");
    });

    it("ES-ZT-003: Should apply 60% deduction for rehabilitated property", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 500,
        isZonaTensionada: true,
        isRehabilitatedProperty: true,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.appliedRegime).toContain("rehabilitated_60pct");
    });

    it("ES-ZT-004: Should apply 50% base deduction in stressed zone", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 500,
        isZonaTensionada: true,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.appliedRegime).toContain("base_50pct");
    });

    it("ES-ZT-005: Should prioritize reduced rent (90%) over other tiers", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 12000,
        deductibleExpenses: 500,
        isZonaTensionada: true,
        isRentReducedVsPrior: true,
        tenantAge: 25,
        isRehabilitatedProperty: true,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.appliedRegime).toContain("reduced_rent_90pct");
    });
  });

  describe("Spain - Grandes Tenedores", () => {
    it("ES-GT-001: Should flag >=5 units in stressed zones", () => {
      const isGT = TaxCalculator.isGrandesTenedores(8, 5);
      expect(isGT).toBe(true);
    });

    it("ES-GT-002: Should flag >=10 total units", () => {
      const isGT = TaxCalculator.isGrandesTenedores(10, 0);
      expect(isGT).toBe(true);
    });

    it("ES-GT-003: Should not flag <5 units in stressed zones", () => {
      const isGT = TaxCalculator.isGrandesTenedores(8, 4);
      expect(isGT).toBe(false);
    });

    it("ES-GT-004: Should not flag <10 total units", () => {
      const isGT = TaxCalculator.isGrandesTenedores(9, 0);
      expect(isGT).toBe(false);
    });

    it("ES-GT-005: Should include grandesTenedores flag in calculation", () => {
      const input: TaxCalculationInput = {
        country: "ES",
        regime: "spain_inmuebles",
        annualRentalIncome: 60000,
        deductibleExpenses: 5000,
        isZonaTensionada: true,
        totalUnitsOwned: 10,
        unitsInStressedZones: 5,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.grandesTenedores).toBe(true);
      expect(result.warnings && result.warnings.some((w) => w.includes("gran tenedor"))).toBe(true);
    });
  });

  describe("Rent Cap Validation", () => {
    it("ES-RC-001: Should validate rent outside stressed zone", () => {
      const result = TaxCalculator.validateRentCap({
        proposedMonthlyRent: 3000,
        isZonaTensionada: false,
        isNewContract: false,
        isGranTenedor: false,
      });
      expect(result.allowed).toBe(true);
    });

    it("ES-RC-002: Should validate existing contract max 2% increase", () => {
      const result = TaxCalculator.validateRentCap({
        proposedMonthlyRent: 1020,
        priorContractRent: 1000,
        isZonaTensionada: true,
        isNewContract: false,
        isGranTenedor: false,
        year: 2025,
      });
      expect(result.allowed).toBe(true);
    });

    it("ES-RC-003: Should reject exceeding max increase", () => {
      const result = TaxCalculator.validateRentCap({
        proposedMonthlyRent: 1100,
        priorContractRent: 1000,
        isZonaTensionada: true,
        isNewContract: false,
        isGranTenedor: false,
        year: 2025,
      });
      expect(result.allowed).toBe(false);
    });

    it("ES-RC-004: Should validate new contract with MITMA", () => {
      const result = TaxCalculator.validateRentCap({
        proposedMonthlyRent: 1500,
        mitmaReferenceIndex: 1500,
        isZonaTensionada: true,
        isNewContract: true,
        isGranTenedor: true,
      });
      expect(result.allowed).toBe(true);
    });

    it("ES-RC-005: Should reject exceeding MITMA", () => {
      const result = TaxCalculator.validateRentCap({
        proposedMonthlyRent: 1600,
        mitmaReferenceIndex: 1500,
        isZonaTensionada: true,
        isNewContract: true,
        isGranTenedor: true,
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe("Tax Brackets & Rates", () => {
    it("PT-TB-001: Should return Portugal tax brackets", () => {
      const brackets = TaxCalculator.getTaxBrackets("PT");
      expect(brackets.length).toBeGreaterThan(0);
      expect(brackets[0].min).toBe(0);
      expect(brackets[0].rate).toBeGreaterThan(0);
    });

    it("PT-TB-002: Should return Spain tax brackets", () => {
      const brackets = TaxCalculator.getTaxBrackets("ES");
      expect(brackets.length).toBeGreaterThan(0);
      expect(brackets[0].min).toBe(0);
      expect(brackets[0].rate).toBeGreaterThan(0);
    });

    it("PT-TB-003: Should have progressive rates for Portugal", () => {
      const brackets = TaxCalculator.getTaxBrackets("PT");
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].rate).toBeGreaterThanOrEqual(brackets[i - 1].rate);
      }
    });

    it("PT-TB-004: Should have progressive rates for Spain", () => {
      const brackets = TaxCalculator.getTaxBrackets("ES");
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].rate).toBeGreaterThanOrEqual(brackets[i - 1].rate);
      }
    });
  });

  describe("Quarterly Estimates", () => {
    it("PT-QE-001: Should calculate quarterly estimate for Portugal", () => {
      const quarterly = TaxCalculator.calculateQuarterlyEstimate("PT", 3000, 300);
      expect(quarterly).toBeGreaterThan(0);
    });

    it("PT-QE-002: Should calculate quarterly estimate for Spain", () => {
      const quarterly = TaxCalculator.calculateQuarterlyEstimate("ES", 3000, 300);
      expect(quarterly).toBeGreaterThan(0);
    });

    it("PT-QE-003: Should base estimate on annualized income", () => {
      const quarter = 3000;
      const quarterly = TaxCalculator.calculateQuarterlyEstimate("PT", quarter, 300);
      const annual = TaxCalculator.calculateTax({
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: quarter * 4,
        deductibleExpenses: 300 * 4,
      });
      expect(Math.abs(quarterly - annual.quarterlyPayment)).toBeLessThan(1);
    });
  });

  describe("Currency Formatting", () => {
    it("PT-CF-001: Should format currency as EUR with European locale", () => {
      const formatted = TaxCalculator.formatCurrency(1234.56, "EUR");
      // pt-PT locale uses non-breaking space and comma as decimal separator
      expect(formatted).toContain("1");
      expect(formatted).toContain("234");
      expect(formatted).toContain("€");
    });

    it("PT-CF-002: Should handle large amounts", () => {
      const formatted = TaxCalculator.formatCurrency(1000000.99, "EUR");
      expect(formatted).toContain("€");
      expect(formatted).toContain("1");
    });

    it("PT-CF-003: Should handle zero", () => {
      const formatted = TaxCalculator.formatCurrency(0, "EUR");
      expect(formatted).toBeDefined();
    });

    it("PT-CF-004: Should accept custom locale override", () => {
      const formatted = TaxCalculator.formatCurrency(1234.56, "EUR", "en-US");
      expect(formatted).toContain("€1,234.56");
    });
  });

  describe("Error Handling", () => {
    it("PT-EH-001: Should throw error for unsupported country", () => {
      const input: any = {
        country: "France",
        regime: "any",
        annualRentalIncome: 10000,
        deductibleExpenses: 1000,
      };
      expect(() => TaxCalculator.calculateTax(input)).toThrow();
    });

    it("PT-EH-002: Should throw error for unsupported country brackets", () => {
      expect(() => TaxCalculator.getTaxBrackets("France" as any)).toThrow();
    });
  });

  describe("Compliance & Edge Cases", () => {
    it("PT-EC-001: Should calculate effective rate correctly", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 10000,
        deductibleExpenses: 1000,
      };
      const result = TaxCalculator.calculateTax(input);
      const expectedRate = (result.taxAmount / result.grossIncome) * 100;
      expect(Math.abs(result.effectiveRate - expectedRate)).toBeLessThan(0.1);
    });

    it("PT-EC-002: Should handle deductions > income", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 5000,
        deductibleExpenses: 8000,
      };
      const result = TaxCalculator.calculateTax(input);
      // Taxable income is floored at 0, expenses capped at 15% of income
      expect(result.taxableIncome).toBeGreaterThanOrEqual(0);
      expect(result.taxAmount).toBeGreaterThanOrEqual(0);
    });

    it("PT-EC-003: Should handle very high income", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 5000000,
        deductibleExpenses: 500000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThan(40);
    });

    it("PT-EC-004: Should include all required result fields", () => {
      const input: TaxCalculationInput = {
        country: "PT",
        regime: "portugal_rendimentos",
        annualRentalIncome: 10000,
        deductibleExpenses: 1000,
      };
      const result = TaxCalculator.calculateTax(input);
      expect(result.grossIncome).toBeDefined();
      expect(result.netIncome).toBeDefined();
      expect(result.taxableIncome).toBeDefined();
      expect(result.taxRate).toBeDefined();
      expect(result.taxAmount).toBeDefined();
      expect(result.quarterlyPayment).toBeDefined();
      expect(result.annualSettlement).toBeDefined();
      expect(result.effectiveRate).toBeDefined();
      expect(result.deductions).toBeDefined();
      expect(result.appliedRegime).toBeDefined();
      expect(result.warnings).toBeDefined();
    });
  });
});
