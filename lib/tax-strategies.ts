import { TaxCalculationResult, ExpenseDeductibilityResult, ITaxStrategy } from './types';
import { formatCurrency } from './currency';

// Let's first re-declare the core types here if not fully present or for ease of local consumption.
export interface TaxResult {
  taxableAmount: number;
  estimatedTaxImpact: number;
  projectedTaxRate: number;
}

export interface ExpenseResult {
  deductibleStatus: 'fully' | 'partially' | 'none';
  deductibleAmount: number;
  amortizationYears: number;
}

export class PortugalTaxStrategy implements ITaxStrategy {
  countryCode = 'PT';

  calculateReceiptTax(
    amount: number,
    leaseDurationInMonths: number,
    propertyClass: string
  ): TaxResult {
    // If it's a deposit or not rental income, it's typically not taxable as rent
    if (propertyClass === 'deposit') {
      return { taxableAmount: 0, estimatedTaxImpact: 0, projectedTaxRate: 0 };
    }

    // Determine autonomous tax rate based on lease duration
    // Article 72 of Portuguese Tax Code (IRS)
    let taxRate = 28.0; // standard flat rate
    const years = leaseDurationInMonths / 12;

    if (years >= 20) {
      taxRate = 7.0; // 75% relief
    } else if (years >= 10) {
      taxRate = 11.2; // 60% relief
    } else if (years >= 5) {
      taxRate = 14.0; // 50% relief
    } else if (years >= 2) {
      taxRate = 21.0; // 25% relief
    }

    const taxableAmount = amount; // rental income is 100% taxable before deductions
    const estimatedTaxImpact = (taxableAmount * taxRate) / 100;

    return {
      taxableAmount,
      estimatedTaxImpact,
      projectedTaxRate: taxRate,
    };
  }

  evaluateExpenseDeductibility(
    category: string,
    amount: number
  ): ExpenseResult {
    const cat = category.toLowerCase();
    
    // In Portugal: IMI tax, condo fees, utility payments, and repairs are deductible.
    // Finance costs (mortgage interest) and furniture depreciation are NOT deductible from rental income.
    if (
      cat.includes('repair') ||
      cat.includes('maintenance') ||
      cat.includes('condo') ||
      cat.includes('utility') ||
      cat.includes('tax') ||
      cat.includes('insurance')
    ) {
      return {
        deductibleStatus: 'fully',
        deductibleAmount: amount,
        amortizationYears: 0,
      };
    }

    // Mortgage/finance is non-deductible against Categoria F rent
    if (cat.includes('mortgage') || cat.includes('interest') || cat.includes('finance')) {
      return {
        deductibleStatus: 'none',
        deductibleAmount: 0,
        amortizationYears: 0,
      };
    }

    return {
      deductibleStatus: 'partially',
      deductibleAmount: amount * 0.5,
      amortizationYears: 0,
    };
  }

  generateStrategyInsights(
    leaseDurationInMonths: number,
    totalAnnualIncome: number,
    totalAnnualDeductible: number
  ): string[] {
    const years = leaseDurationInMonths / 12;
    const insights: string[] = [];

    if (years < 2) {
      insights.push(
        "🇵🇹 Active short-term lease is taxed at the standard 28.0% flat rate. Shifting to a 2-year lease drops tax rate to 21.0% (saving 7.0%)."
      );
    } else if (years >= 2 && years < 5) {
      insights.push(
        "🇵🇹 Medium-term lease tax bracket is 21.0%. Extending lease to 5 years reduces tax to 14.0% (saving 7.0%)."
      );
    } else if (years >= 5 && years < 10) {
      insights.push(
        "🇵🇹 Long-term lease tax bracket is 14.0%. Extending lease to 10 years reduces tax to 11.2%."
      );
    }

    if (totalAnnualDeductible > 0) {
      insights.push(
        `🇵🇹 Deductible expenses will reduce your net taxable income by ${formatCurrency(totalAnnualDeductible, 'EUR')} this calendar period.`
      );
    }

    return insights;
  }
}

export class GermanyTaxStrategy implements ITaxStrategy {
  countryCode = 'DE';

  calculateReceiptTax(
    amount: number,
    leaseDurationInMonths: number,
    propertyClass: string
  ): TaxResult {
    // German progressive tax rate estimation (using average rate estimation for solo landlords ~30%)
    const averageTaxRate = 30.0;
    const taxableAmount = amount;
    const estimatedTaxImpact = (taxableAmount * averageTaxRate) / 100;

    return {
      taxableAmount,
      estimatedTaxImpact,
      projectedTaxRate: averageTaxRate,
    };
  }

  evaluateExpenseDeductibility(
    category: string,
    amount: number
  ): ExpenseResult {
    const cat = category.toLowerCase();
    
    // In Germany: mortgage interest, repairs, management fees, advertising, etc., are 100% deductible (Werbungskosten).
    if (
      cat.includes('interest') ||
      cat.includes('mortgage') ||
      cat.includes('repair') ||
      cat.includes('maintenance') ||
      cat.includes('management') ||
      cat.includes('insurance') ||
      cat.includes('utility')
    ) {
      return {
        deductibleStatus: 'fully',
        deductibleAmount: amount,
        amortizationYears: 0,
      };
    }

    // Capital expenditures over €800 require linear depreciation amortization
    if (cat.includes('capital') || cat.includes('appliance') || cat.includes('renovation')) {
      return {
        deductibleStatus: 'partially',
        deductibleAmount: amount,
        amortizationYears: 10, // standard building component depreciation
      };
    }

    return {
      deductibleStatus: 'fully',
      deductibleAmount: amount,
      amortizationYears: 0,
    };
  }

  generateStrategyInsights(
    leaseDurationInMonths: number,
    totalAnnualIncome: number,
    totalAnnualDeductible: number
  ): string[] {
    return [
      "🇩🇪 Interest on mortgages is 100% deductible against rental income. Optimize leverage to reduce income tax burden.",
      "🇩🇪 Hold this property for at least 10 years to completely avoid German capital gains tax upon resale."
    ];
  }
}

export class SpainTaxStrategy implements ITaxStrategy {
  countryCode = 'ES';

  calculateReceiptTax(
    amount: number,
    leaseDurationInMonths: number,
    propertyClass: string
  ): TaxResult {
    // Non-resident EU rate is 19%
    const rate = 19.0;
    const taxableAmount = amount;
    const estimatedTaxImpact = (taxableAmount * rate) / 100;

    return {
      taxableAmount,
      estimatedTaxImpact,
      projectedTaxRate: rate,
    };
  }

  evaluateExpenseDeductibility(
    category: string,
    amount: number
  ): ExpenseResult {
    const cat = category.toLowerCase();
    if (
      cat.includes('repair') ||
      cat.includes('maintenance') ||
      cat.includes('tax') ||
      cat.includes('insurance') ||
      cat.includes('condo')
    ) {
      return {
        deductibleStatus: 'fully',
        deductibleAmount: amount,
        amortizationYears: 0,
      };
    }
    return {
      deductibleStatus: 'partially',
      deductibleAmount: amount * 0.6,
      amortizationYears: 0,
    };
  }

  generateStrategyInsights(
    leaseDurationInMonths: number,
    totalAnnualIncome: number,
    totalAnnualDeductible: number
  ): string[] {
    return [
      "🇪🇸 If leased as the tenant's primary long-term residence, resident landlords enjoy a massive 50% discount on net taxable income."
    ];
  }
}

export class FranceTaxStrategy implements ITaxStrategy {
  countryCode = 'FR';

  calculateReceiptTax(
    amount: number,
    leaseDurationInMonths: number,
    propertyClass: string
  ): TaxResult {
    // Micro-Foncier automatic 30% discount simulation
    const standardRate = 20.0; // average bracket simulation
    const taxableAmount = amount * 0.7; // automatically deduct 30% micro-foncier
    const estimatedTaxImpact = (taxableAmount * standardRate) / 100;

    return {
      taxableAmount,
      estimatedTaxImpact,
      projectedTaxRate: standardRate * 0.7, // effective tax rate
    };
  }

  evaluateExpenseDeductibility(
    category: string,
    amount: number
  ): ExpenseResult {
    // Real regime vs Micro-foncier
    return {
      deductibleStatus: 'fully',
      deductibleAmount: amount,
      amortizationYears: 0,
    };
  }

  generateStrategyInsights(
    leaseDurationInMonths: number,
    totalAnnualIncome: number,
    totalAnnualDeductible: number
  ): string[] {
    return [
      "🇫🇷 Consider registering under the LMNP (Furnished Rental) status and selecting 'Régime Réel' to deduct building component depreciation, reducing rental tax to near-zero."
    ];
  }
}

export class DenmarkTaxStrategy implements ITaxStrategy {
  countryCode = 'DK';

  calculateReceiptTax(
    amount: number,
    leaseDurationInMonths: number,
    propertyClass: string
  ): TaxResult {
    const rate = 36.0; // typical starting rate for capital income
    const taxableAmount = amount;
    const estimatedTaxImpact = (taxableAmount * rate) / 100;

    return {
      taxableAmount,
      estimatedTaxImpact,
      projectedTaxRate: rate,
    };
  }

  evaluateExpenseDeductibility(
    category: string,
    amount: number
  ): ExpenseResult {
    return {
      deductibleStatus: 'fully',
      deductibleAmount: amount,
      amortizationYears: 0,
    };
  }

  generateStrategyInsights(
    leaseDurationInMonths: number,
    totalAnnualIncome: number,
    totalAnnualDeductible: number
  ): string[] {
    return [
      "🇩🇰 Make sure to deduct standard local property tax assessments (ejendomsværdiskat) against your annual Danish returns."
    ];
  }
}

export class TaxEngine {
  private static strategies: Record<string, ITaxStrategy> = {
    PT: new PortugalTaxStrategy(),
    DE: new GermanyTaxStrategy(),
    ES: new SpainTaxStrategy(),
    FR: new FranceTaxStrategy(),
    DK: new DenmarkTaxStrategy(),
  };

  static getStrategy(countryCode: string): ITaxStrategy {
    const code = countryCode.toUpperCase();
    return this.strategies[code] || this.strategies['PT']; // default to Portugal
  }

  static calculateLeaseTax(
    countryCode: string,
    annualRent: number,
    leaseStart: string,
    leaseEnd: string
  ): { projectedTaxRate: number; annualTaxLiabilityForecast: number } {
    const start = new Date(leaseStart);
    const end = new Date(leaseEnd);
    
    // Calculate months between
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const leaseDurationInMonths = Math.max(1, Math.round(diffDays / 30));

    const strategy = this.getStrategy(countryCode);
    const result = strategy.calculateReceiptTax(annualRent, leaseDurationInMonths, 'rental_income');

    return {
      projectedTaxRate: result.projectedTaxRate,
      annualTaxLiabilityForecast: result.estimatedTaxImpact,
    };
  }
}
