/**
 * Tax calculation engine for Portugal and Spain rental income
 * Updated for 2025/2026 tax regulations
 *
 * Portugal: IRS (Imposto sobre o Rendimento das Pessoas Singulares)
 * - Progressive brackets updated for 2025/2026
 * - Renda acessível (affordable rent) 10% flat rate support
 *
 * Spain: IRPF (Impuesto sobre la Renta de las Personas Físicas)
 * - Ley de Vivienda (Housing Law 12/2023) rent caps
 * - Stressed-zone (zona tensionada) deductions: 50%/60%/70%/90%
 * - Grandes Tenedores (large holders) detection
 */

// ─── Portugal: Renda Acessível (Affordable Rent) ─────────────────────────
// Landlords who participate in programa de renda acessível get a flat 10% IRS rate
// Conditions: monthly rent ≤ threshold (€2,300 for 2026), property registered with IHRU

export const PT_RENDA_ACESSIVEL_THRESHOLD_2026 = 2300; // €/month max rent
export const PT_RENDA_ACESSIVEL_RATE = 0.1; // 10% flat rate

// ─── Spain: Ley de Vivienda / Stressed Zones ────────────────────────────
// Reduction tiers for rental income in IRPF when renting in stressed zones

export const ES_STRESSED_ZONE_DEDUCTIONS = {
  /** 90% deduction: rent reduced ≥5% vs. prior contract in zona tensionada */
  REDUCED_RENT: 0.9,
  /** 70% deduction: first rental to tenant aged 18-35 in zona tensionada */
  YOUNG_TENANT: 0.7,
  /** 60% deduction: property with substantial renovation (≥2 yrs prior) */
  REHABILITATED: 0.6,
  /** 50% deduction: base deduction for any residential rental (general) */
  BASE: 0.5,
} as const;

export const ES_GRANDES_TENEDORES_THRESHOLD_STRESSED = 5; // 5+ units in stressed zone
export const ES_GRANDES_TENEDORES_THRESHOLD_GENERAL = 10; // 10+ units outside stressed zone

export interface TaxCalculationInput {
  country: "Portugal" | "Spain";
  regime: "portugal_rendimentos" | "spain_inmuebles";
  annualRentalIncome: number;
  deductibleExpenses: number;
  mortgageInterest?: number;
  communityFees?: number;
  yearsOfOwnership?: number;

  // Portugal: renda acessível
  isRendaAcessivel?: boolean;
  monthlyRent?: number; // to validate against threshold

  // Spain: Ley de Vivienda
  isZonaTensionada?: boolean;
  stressedZoneDeductionTier?: keyof typeof ES_STRESSED_ZONE_DEDUCTIONS;
  tenantAge?: number;
  isRehabilitatedProperty?: boolean;
  isRentReducedVsPrior?: boolean; // rent reduced ≥5% vs. prior contract
  totalUnitsOwned?: number; // for grandes tenedores
  unitsInStressedZones?: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  netIncome: number;
  taxableIncome: number;
  taxRate: number;
  taxAmount: number;
  quarterlyPayment: number;
  annualSettlement: number;
  effectiveRate: number;
  deductions: {
    total: number;
    breakdown: Record<string, number>;
  };
  // New: compliance metadata
  appliedRegime?: string;
  warnings?: string[];
  grandesTenedores?: boolean;
  rentCapApplied?: boolean;
}

// ─── Portugal IRS Brackets 2025/2026 ─────────────────────────────────────
// Source: Código do IRS, updated for 2025 (Orçamento do Estado 2025)
const PT_TAX_BRACKETS_2026 = [
  { min: 0, max: 7703, rate: 0.1325 },
  { min: 7703, max: 11623, rate: 0.18 },
  { min: 11623, max: 16472, rate: 0.23 },
  { min: 16472, max: 21321, rate: 0.26 },
  { min: 21321, max: 27146, rate: 0.3275 },
  { min: 27146, max: 39791, rate: 0.37 },
  { min: 39791, max: 51997, rate: 0.435 },
  { min: 51997, max: 81199, rate: 0.45 },
  { min: 81199, max: Infinity, rate: 0.48 },
];

// ─── Spain IRPF Brackets for rental income 2025/2026 ────────────────────
const ES_TAX_BRACKETS_2026 = [
  { min: 0, max: 12450, rate: 0.19 },
  { min: 12450, max: 20200, rate: 0.24 },
  { min: 20200, max: 35200, rate: 0.3 },
  { min: 35200, max: 60000, rate: 0.37 },
  { min: 60000, max: 300000, rate: 0.45 },
  { min: 300000, max: Infinity, rate: 0.47 },
];

export class TaxCalculator {
  /**
   * Calculate tax for Portugal - Rendimentos Prediais (Categoria F)
   */
  private static calculatePortugalTax(
    input: TaxCalculationInput,
  ): TaxCalculationResult {
    const {
      annualRentalIncome,
      deductibleExpenses,
      yearsOfOwnership = 1,
    } = input;
    const warnings: string[] = [];

    // ── Renda Acessível: flat 10% rate ──
    if (input.isRendaAcessivel) {
      const monthlyRent = input.monthlyRent ?? annualRentalIncome / 12;
      if (monthlyRent > PT_RENDA_ACESSIVEL_THRESHOLD_2026) {
        warnings.push(
          `Monthly rent €${monthlyRent.toFixed(0)} exceeds renda acessível threshold of €${PT_RENDA_ACESSIVEL_THRESHOLD_2026}. Standard brackets applied.`,
        );
      } else {
        // Flat 10% on gross income — no deductions apply under this regime
        const taxAmount = annualRentalIncome * PT_RENDA_ACESSIVEL_RATE;
        return {
          grossIncome: annualRentalIncome,
          netIncome: annualRentalIncome - taxAmount,
          taxableIncome: annualRentalIncome,
          taxRate: 10,
          taxAmount,
          quarterlyPayment: taxAmount / 4,
          annualSettlement: taxAmount,
          effectiveRate: 10,
          deductions: { total: 0, breakdown: {} },
          appliedRegime: "renda_acessivel_10pct",
          warnings,
        };
      }
    }

    // ── Standard progressive brackets (Categoria F — Rendimentos Prediais) ──
    // Deductible expenses capped at 15% of gross income
    const maxDeductible = Math.min(
      annualRentalIncome * 0.15,
      deductibleExpenses,
    );
    const taxableIncome = Math.max(0, annualRentalIncome - maxDeductible);

    let taxAmount = 0;
    let marginalRate = 0;
    let remaining = taxableIncome;

    for (const bracket of PT_TAX_BRACKETS_2026) {
      const bracketWidth =
        bracket.max === Infinity ? remaining : bracket.max - bracket.min;
      const taxableInBracket = Math.min(remaining, bracketWidth);
      if (taxableInBracket <= 0) break;
      taxAmount += taxableInBracket * bracket.rate;
      marginalRate = bracket.rate * 100;
      remaining -= taxableInBracket;
    }

    // Ownership bonus (5% per year, max 15%)
    const ownershipBonus = Math.min(yearsOfOwnership * 0.05, 0.15);
    const finalTaxAmount = taxAmount * (1 - ownershipBonus);

    return {
      grossIncome: annualRentalIncome,
      netIncome: annualRentalIncome - deductibleExpenses,
      taxableIncome,
      taxRate: marginalRate,
      taxAmount: finalTaxAmount,
      quarterlyPayment: finalTaxAmount / 4,
      annualSettlement: finalTaxAmount,
      effectiveRate:
        annualRentalIncome > 0
          ? (finalTaxAmount / annualRentalIncome) * 100
          : 0,
      deductions: {
        total: deductibleExpenses + taxableIncome * ownershipBonus,
        breakdown: {
          expenses: deductibleExpenses,
          ownershipBonus: taxableIncome * ownershipBonus,
          maxDeductible,
        },
      },
      appliedRegime: "portugal_categoria_f_standard",
      warnings,
    };
  }

  /**
   * Calculate tax for Spain - IRPF Inmuebles Urbanos
   * Includes Ley de Vivienda stressed-zone deductions (Art. 23 LIRPF modified 2024)
   */
  private static calculateSpainTax(
    input: TaxCalculationInput,
  ): TaxCalculationResult {
    const {
      annualRentalIncome,
      deductibleExpenses,
      mortgageInterest = 0,
      communityFees = 0,
    } = input;
    const warnings: string[] = [];

    // ── Grandes Tenedores detection ──
    const grandesTenedores = TaxCalculator.isGrandesTenedores(
      input.totalUnitsOwned ?? 0,
      input.unitsInStressedZones ?? 0,
    );
    if (grandesTenedores) {
      warnings.push(
        'Classified as "gran tenedor" — stricter rent cap rules apply per Ley de Vivienda Art. 17.6.',
      );
    }

    // ── Total deductions (general expenses) ──
    const totalDeductions =
      deductibleExpenses + mortgageInterest + communityFees;
    const maxDeductible = annualRentalIncome * 0.5;
    const actualDeductions = Math.min(totalDeductions, maxDeductible);
    const netRentalIncome = Math.max(0, annualRentalIncome - actualDeductions);

    // ── Stressed-zone deduction (Art. 23 LIRPF as modified by Ley de Vivienda) ──
    let stressedZoneReduction = 0;
    let appliedTier = "none";

    if (input.isZonaTensionada) {
      // Priority order: 90% > 70% > 60% > 50%
      if (input.isRentReducedVsPrior) {
        stressedZoneReduction = ES_STRESSED_ZONE_DEDUCTIONS.REDUCED_RENT;
        appliedTier = "reduced_rent_90pct";
      } else if (
        input.tenantAge &&
        input.tenantAge >= 18 &&
        input.tenantAge <= 35
      ) {
        stressedZoneReduction = ES_STRESSED_ZONE_DEDUCTIONS.YOUNG_TENANT;
        appliedTier = "young_tenant_70pct";
      } else if (input.isRehabilitatedProperty) {
        stressedZoneReduction = ES_STRESSED_ZONE_DEDUCTIONS.REHABILITATED;
        appliedTier = "rehabilitated_60pct";
      } else {
        stressedZoneReduction = ES_STRESSED_ZONE_DEDUCTIONS.BASE;
        appliedTier = "base_50pct";
      }
    } else {
      // Outside stressed zones: standard 50% deduction for residential
      stressedZoneReduction = ES_STRESSED_ZONE_DEDUCTIONS.BASE;
      appliedTier = "standard_50pct";
    }

    const taxableIncome = netRentalIncome * (1 - stressedZoneReduction);

    // ── Apply IRPF progressive brackets ──
    let taxAmount = 0;
    let marginalRate = 0;
    let remaining = taxableIncome;

    for (const bracket of ES_TAX_BRACKETS_2026) {
      const bracketWidth =
        bracket.max === Infinity ? remaining : bracket.max - bracket.min;
      const taxableInBracket = Math.min(remaining, bracketWidth);
      if (taxableInBracket <= 0) break;
      taxAmount += taxableInBracket * bracket.rate;
      marginalRate = bracket.rate * 100;
      remaining -= taxableInBracket;
    }

    return {
      grossIncome: annualRentalIncome,
      netIncome: annualRentalIncome - totalDeductions,
      taxableIncome,
      taxRate: marginalRate,
      taxAmount,
      quarterlyPayment: taxAmount / 4,
      annualSettlement: taxAmount,
      effectiveRate:
        annualRentalIncome > 0 ? (taxAmount / annualRentalIncome) * 100 : 0,
      deductions: {
        total: actualDeductions + netRentalIncome * stressedZoneReduction,
        breakdown: {
          expenses: deductibleExpenses,
          mortgageInterest,
          communityFees,
          maxDeductible,
          stressedZoneReduction: netRentalIncome * stressedZoneReduction,
          stressedZoneTier: appliedTier as unknown as number,
        },
      },
      appliedRegime: `spain_irpf_${appliedTier}`,
      warnings,
      grandesTenedores,
    };
  }

  /**
   * Determine if landlord is a "gran tenedor" (large holder)
   * Ley de Vivienda Art. 3.k:
   * - ≥5 urban residential units in a zona tensionada, OR
   * - ≥10 urban residential units (or >1,500m² residential) anywhere
   */
  static isGrandesTenedores(
    totalUnits: number,
    unitsInStressedZones: number,
  ): boolean {
    if (unitsInStressedZones >= ES_GRANDES_TENEDORES_THRESHOLD_STRESSED)
      return true;
    if (totalUnits >= ES_GRANDES_TENEDORES_THRESHOLD_GENERAL) return true;
    return false;
  }

  /**
   * Validate rent against Ley de Vivienda cap for stressed zones
   * Returns the maximum legal rent and whether the proposed rent exceeds it.
   *
   * For existing tenants: rent increase capped at INE reference index (max 3% for 2024, 2% for 2025)
   * For new contracts (non-gran-tenedor): limited by prior contract rent
   * For new contracts (gran tenedor): limited by official MITMA reference index
   */
  static validateRentCap(params: {
    proposedMonthlyRent: number;
    priorContractRent?: number;
    mitmaReferenceIndex?: number;
    isNewContract: boolean;
    isZonaTensionada: boolean;
    isGranTenedor: boolean;
    year?: number;
  }): { allowed: boolean; maxRent: number; reason: string } {
    const {
      proposedMonthlyRent,
      priorContractRent,
      mitmaReferenceIndex,
      isNewContract,
      isZonaTensionada,
      isGranTenedor,
    } = params;
    const year = params.year ?? 2026;

    if (!isZonaTensionada) {
      return {
        allowed: true,
        maxRent: proposedMonthlyRent,
        reason: "Property not in zona tensionada — no cap applies.",
      };
    }

    // INE reference index cap for rent updates (existing contracts)
    const maxAnnualIncrease = year >= 2025 ? 0.02 : 0.03; // 2% from 2025, 3% for 2024

    if (!isNewContract && priorContractRent) {
      const maxRent = priorContractRent * (1 + maxAnnualIncrease);
      return {
        allowed: proposedMonthlyRent <= maxRent,
        maxRent,
        reason: `Existing contract in zona tensionada: max increase ${(maxAnnualIncrease * 100).toFixed(0)}% (INE reference index). Max: €${maxRent.toFixed(2)}/mo.`,
      };
    }

    // New contracts
    if (isNewContract) {
      if (isGranTenedor && mitmaReferenceIndex) {
        // Gran tenedor: must use MITMA official reference index
        return {
          allowed: proposedMonthlyRent <= mitmaReferenceIndex,
          maxRent: mitmaReferenceIndex,
          reason: `Gran tenedor in zona tensionada: rent capped at MITMA reference index €${mitmaReferenceIndex.toFixed(2)}/mo.`,
        };
      }

      if (priorContractRent) {
        // Non-gran-tenedor: capped at prior contract rent (adjusted by index)
        const maxRent = priorContractRent * (1 + maxAnnualIncrease);
        return {
          allowed: proposedMonthlyRent <= maxRent,
          maxRent,
          reason: `New contract in zona tensionada: capped at prior rent + ${(maxAnnualIncrease * 100).toFixed(0)}%. Max: €${maxRent.toFixed(2)}/mo.`,
        };
      }

      if (mitmaReferenceIndex) {
        return {
          allowed: proposedMonthlyRent <= mitmaReferenceIndex,
          maxRent: mitmaReferenceIndex,
          reason: `New contract in zona tensionada (no prior rent): capped at MITMA reference index €${mitmaReferenceIndex.toFixed(2)}/mo.`,
        };
      }
    }

    return {
      allowed: true,
      maxRent: proposedMonthlyRent,
      reason:
        "Insufficient data to validate rent cap. Ensure prior rent or MITMA index is provided.",
    };
  }

  /**
   * Main calculation method
   */
  static calculateTax(input: TaxCalculationInput): TaxCalculationResult {
    if (input.country === "Portugal") {
      return this.calculatePortugalTax(input);
    } else if (input.country === "Spain") {
      return this.calculateSpainTax(input);
    }

    throw new Error(`Unsupported country: ${input.country}`);
  }

  /**
   * Get tax brackets for a country (for display purposes)
   */
  static getTaxBrackets(
    country: "Portugal" | "Spain",
  ): Array<{ min: number; max: number; rate: number }> {
    if (country === "Portugal") {
      return PT_TAX_BRACKETS_2026.map((b) => ({
        min: b.min,
        max: b.max,
        rate: b.rate * 100,
      }));
    } else if (country === "Spain") {
      return ES_TAX_BRACKETS_2026.map((b) => ({
        min: b.min,
        max: b.max,
        rate: b.rate * 100,
      }));
    }

    return [];
  }

  /**
   * Estimate quarterly tax payments
   */
  static calculateQuarterlyEstimate(
    country: "Portugal" | "Spain",
    quarterlyIncome: number,
    quarterlyExpenses: number,
  ): number {
    const annualEstimate = this.calculateTax({
      country,
      regime:
        country === "Portugal" ? "portugal_rendimentos" : "spain_inmuebles",
      annualRentalIncome: quarterlyIncome * 4,
      deductibleExpenses: quarterlyExpenses * 4,
    });

    return annualEstimate.quarterlyPayment;
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
