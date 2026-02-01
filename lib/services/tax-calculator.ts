/**
 * Tax calculation engine for Portugal and Spain rental income
 * Based on 2024 tax regulations - should be reviewed annually
 */

export interface TaxCalculationInput {
  country: 'Portugal' | 'Spain';
  regime: 'portugal_rendimentos' | 'spain_inmuebles';
  annualRentalIncome: number;
  deductibleExpenses: number; // Repairs, maintenance, taxes, insurance
  mortgageInterest?: number; // For Spain
  communityFees?: number; // For Spain
  yearsOfOwnership?: number; // For Portugal progressive tax
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
}

export class TaxCalculator {
  /**
   * Calculate tax for Portugal - Rendimentos de Capitais
   * Based on IRS (Imposto sobre o Rendimento das Pessoas Singulares)
   */
  private static calculatePortugalTax(input: TaxCalculationInput): TaxCalculationResult {
    const { annualRentalIncome, deductibleExpenses, yearsOfOwnership = 1 } = input;

    // Deductible expenses (up to 15% of gross income or actual expenses)
    const maxDeductible = Math.min(annualRentalIncome * 0.15, deductibleExpenses);
    const taxableIncome = Math.max(0, annualRentalIncome - maxDeductible);

    // Progressive tax brackets (2024)
    let taxAmount = 0;
    let marginalRate = 0;

    if (taxableIncome <= 7520) {
      taxAmount = taxableIncome * 0.12;
      marginalRate = 12;
    } else if (taxableIncome <= 11284) {
      taxAmount = 7520 * 0.12 + (taxableIncome - 7520) * 0.15;
      marginalRate = 15;
    } else if (taxableIncome <= 15992) {
      taxAmount = 7520 * 0.12 + (11284 - 7520) * 0.15 + (taxableIncome - 11284) * 0.21;
      marginalRate = 21;
    } else if (taxableIncome <= 20700) {
      taxAmount = 7520 * 0.12 + (11284 - 7520) * 0.15 + (15992 - 11284) * 0.21 + (taxableIncome - 15992) * 0.26;
      marginalRate = 26;
    } else if (taxableIncome <= 26355) {
      taxAmount = 7520 * 0.12 + (11284 - 7520) * 0.15 + (15992 - 11284) * 0.21 + (20700 - 15992) * 0.26 + (taxableIncome - 20700) * 0.29;
      marginalRate = 29;
    } else if (taxableIncome <= 50752) {
      taxAmount = 7520 * 0.12 + (11284 - 7520) * 0.15 + (15992 - 11284) * 0.21 + (20700 - 15992) * 0.26 + (26355 - 20700) * 0.29 + (taxableIncome - 26355) * 0.31;
      marginalRate = 31;
    } else {
      taxAmount = 7520 * 0.12 + (11284 - 7520) * 0.15 + (15992 - 11284) * 0.21 + (20700 - 15992) * 0.26 + (26355 - 20700) * 0.29 + (50752 - 26355) * 0.31 + (taxableIncome - 50752) * 0.35;
      marginalRate = 35;
    }

    // Apply property ownership bonus (reduces taxable income by 5-15% based on years owned)
    const ownershipBonus = Math.min(yearsOfOwnership * 0.05, 0.15);
    const finalTaxableIncome = taxableIncome * (1 - ownershipBonus);
    const finalTaxAmount = taxAmount * (1 - ownershipBonus);

    return {
      grossIncome: annualRentalIncome,
      netIncome: annualRentalIncome - deductibleExpenses,
      taxableIncome: finalTaxableIncome,
      taxRate: marginalRate,
      taxAmount: finalTaxAmount,
      quarterlyPayment: finalTaxAmount / 4,
      annualSettlement: finalTaxAmount,
      effectiveRate: (finalTaxAmount / annualRentalIncome) * 100,
      deductions: {
        total: deductibleExpenses + (taxableIncome * ownershipBonus),
        breakdown: {
          expenses: deductibleExpenses,
          ownershipBonus: taxableIncome * ownershipBonus,
          maxDeductible,
        }
      }
    };
  }

  /**
   * Calculate tax for Spain - IRPF Inmuebles Urbanos
   * Based on Impuesto sobre la Renta de las Personas Físicas
   */
  private static calculateSpainTax(input: TaxCalculationInput): TaxCalculationResult {
    const {
      annualRentalIncome,
      deductibleExpenses,
      mortgageInterest = 0,
      communityFees = 0
    } = input;

    // Total deductions
    const totalDeductions = deductibleExpenses + mortgageInterest + communityFees;

    // Taxable income (reduced by deductions, max 50% of gross income)
    const maxDeductible = annualRentalIncome * 0.5;
    const actualDeductions = Math.min(totalDeductions, maxDeductible);
    const taxableIncome = Math.max(0, annualRentalIncome - actualDeductions);

    // Progressive tax brackets for rental income (2024)
    // Note: Spain taxes rental income at marginal rates, but with special rules
    let taxAmount = 0;
    let marginalRate = 0;

    // For rental income, apply 19% for income up to €35,000, then 24% above
    if (taxableIncome <= 35000) {
      taxAmount = taxableIncome * 0.19;
      marginalRate = 19;
    } else {
      taxAmount = 35000 * 0.19 + (taxableIncome - 35000) * 0.24;
      marginalRate = 24;
    }

    return {
      grossIncome: annualRentalIncome,
      netIncome: annualRentalIncome - totalDeductions,
      taxableIncome,
      taxRate: marginalRate,
      taxAmount,
      quarterlyPayment: taxAmount / 4, // Spain requires quarterly payments
      annualSettlement: taxAmount,
      effectiveRate: (taxAmount / annualRentalIncome) * 100,
      deductions: {
        total: actualDeductions,
        breakdown: {
          expenses: deductibleExpenses,
          mortgageInterest,
          communityFees,
          maxDeductible,
        }
      }
    };
  }

  /**
   * Main calculation method
   */
  static calculateTax(input: TaxCalculationInput): TaxCalculationResult {
    if (input.country === 'Portugal') {
      return this.calculatePortugalTax(input);
    } else if (input.country === 'Spain') {
      return this.calculateSpainTax(input);
    }

    throw new Error(`Unsupported country: ${input.country}`);
  }

  /**
   * Get tax brackets for a country (for display purposes)
   */
  static getTaxBrackets(country: 'Portugal' | 'Spain'): Array<{ min: number; max: number; rate: number }> {
    if (country === 'Portugal') {
      return [
        { min: 0, max: 7520, rate: 12 },
        { min: 7520, max: 11284, rate: 15 },
        { min: 11284, max: 15992, rate: 21 },
        { min: 15992, max: 20700, rate: 26 },
        { min: 20700, max: 26355, rate: 29 },
        { min: 26355, max: 50752, rate: 31 },
        { min: 50752, max: Infinity, rate: 35 },
      ];
    } else if (country === 'Spain') {
      return [
        { min: 0, max: 35000, rate: 19 },
        { min: 35000, max: Infinity, rate: 24 },
      ];
    }

    return [];
  }

  /**
   * Estimate quarterly tax payments
   */
  static calculateQuarterlyEstimate(
    country: 'Portugal' | 'Spain',
    quarterlyIncome: number,
    quarterlyExpenses: number
  ): number {
    const annualEstimate = this.calculateTax({
      country,
      regime: country === 'Portugal' ? 'portugal_rendimentos' : 'spain_inmuebles',
      annualRentalIncome: quarterlyIncome * 4,
      deductibleExpenses: quarterlyExpenses * 4,
    });

    return annualEstimate.quarterlyPayment;
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
