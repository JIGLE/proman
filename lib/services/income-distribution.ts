/**
 * Income Distribution Service
 * 
 * Handles multi-owner income splitting with tax calculations
 * Supports pre-tax and post-tax distribution modes
 * Includes audit trail for recalculations
 */

import { TaxCalculator, TaxCalculationInput, TaxCalculationResult } from './tax-calculator';
import { getPrismaClient } from '@/lib/services/database/database';

export type TaxMode = 'pre-tax' | 'post-tax';
export type DistributionFrequency = 'monthly' | 'quarterly' | 'annually';

export interface OwnerShareConfig {
  ownerId: string;
  ownerName: string;
  percentage: number; // 0-100
  taxCountry: 'Portugal' | 'Spain';
  taxResidenceCountry?: string;
  taxIdentificationNumber?: string;
}

export interface DistributionInput {
  propertyId: string;
  periodStart: Date;
  periodEnd: Date;
  totalIncome: number;
  totalExpenses: number;
  owners: OwnerShareConfig[];
  taxMode: TaxMode;
  calculatedByUserId: string;
}

export interface OwnerDistributionShare {
  ownerId: string;
  ownerName: string;
  percentage: number;
  grossShare: number;
  taxableIncome: number;
  taxAmount: number;
  netShare: number;
  taxCountry: string;
  effectiveRate: number;
  taxDetails: TaxCalculationResult;
}

export interface DistributionResult {
  id?: string;
  propertyId: string;
  periodStart: Date;
  periodEnd: Date;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  taxMode: TaxMode;
  shares: OwnerDistributionShare[];
  totalTax: number;
  totalNetDistributed: number;
  version: number;
  calculatedAt: Date;
  calculatedByUserId: string;
}

/**
 * Validate that owner percentages sum to 100
 */
function validateOwnerPercentages(owners: OwnerShareConfig[]): void {
  const total = owners.reduce((sum, o) => sum + o.percentage, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Owner percentages must sum to 100, got ${total.toFixed(2)}`);
  }
}

/**
 * Calculate income distribution for multiple owners
 */
export function calculateDistribution(input: DistributionInput): DistributionResult {
  validateOwnerPercentages(input.owners);

  const netIncome = input.totalIncome - input.totalExpenses;
  
  const shares: OwnerDistributionShare[] = input.owners.map((owner) => {
    const grossShare = netIncome * (owner.percentage / 100);
    
    // Calculate tax for this owner's share
    const taxInput: TaxCalculationInput = {
      country: owner.taxCountry,
      regime: owner.taxCountry === 'Portugal' ? 'portugal_rendimentos' : 'spain_inmuebles',
      annualRentalIncome: grossShare,
      deductibleExpenses: 0, // Expenses already deducted from total
    };
    
    const taxResult = TaxCalculator.calculateTax(taxInput);
    
    return {
      ownerId: owner.ownerId,
      ownerName: owner.ownerName,
      percentage: owner.percentage,
      grossShare,
      taxableIncome: taxResult.taxableIncome,
      taxAmount: taxResult.taxAmount,
      netShare: grossShare - taxResult.taxAmount,
      taxCountry: owner.taxCountry,
      effectiveRate: taxResult.effectiveRate,
      taxDetails: taxResult,
    };
  });

  const totalTax = shares.reduce((sum, s) => sum + s.taxAmount, 0);
  const totalNetDistributed = shares.reduce((sum, s) => sum + s.netShare, 0);

  return {
    propertyId: input.propertyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    totalIncome: input.totalIncome,
    totalExpenses: input.totalExpenses,
    netIncome,
    taxMode: input.taxMode,
    shares,
    totalTax,
    totalNetDistributed,
    version: 1,
    calculatedAt: new Date(),
    calculatedByUserId: input.calculatedByUserId,
  };
}

/**
 * Save distribution to database with audit trail
 * TODO: Requires incomeDistribution and incomeDistributionShare models in Prisma schema
 */
export async function saveDistribution(
  distribution: DistributionResult
): Promise<DistributionResult> {
  // Temporarily disabled - requires Prisma schema update
  console.warn('saveDistribution: incomeDistribution model not available in Prisma schema');
  return distribution;
  
  /* 
  const prisma = getPrismaClient();
  
  // Check for existing distribution in this period
  const existing = await prisma.incomeDistribution.findFirst({
    where: {
      propertyId: distribution.propertyId,
      periodStart: distribution.periodStart,
      periodEnd: distribution.periodEnd,
    },
    orderBy: { version: 'desc' },
  });

  const version = existing ? existing.version + 1 : 1;

  // Create the distribution record
  const created = await prisma.incomeDistribution.create({
    data: {
      propertyId: distribution.propertyId,
      periodStart: distribution.periodStart,
      periodEnd: distribution.periodEnd,
      taxMode: distribution.taxMode,
      totalIncome: distribution.totalIncome,
      totalExpenses: distribution.totalExpenses,
      netIncome: distribution.netIncome,
      version,
      calculatedByUserId: distribution.calculatedByUserId,
      calculatedAt: distribution.calculatedAt,
      recalculatedByUserId: existing ? distribution.calculatedByUserId : null,
      recalculatedAt: existing ? new Date() : null,
      shares: {
        create: distribution.shares.map((share) => ({
          ownerId: share.ownerId,
          percentage: share.percentage,
          grossShare: share.grossShare,
          taxAmount: share.taxAmount,
          netShare: share.netShare,
          taxCountry: share.taxCountry,
          taxRate: share.effectiveRate,
        })),
      },
    },
    include: {
      shares: true,
    },
  });

  return {
    ...distribution,
    id: created.id,
    version,
  };
  */
}

/**
 * Get distribution history for a property (audit trail)
 * TODO: Requires incomeDistribution model in Prisma schema
 */
export async function getDistributionHistory(
  propertyId: string,
  year?: number
): Promise<DistributionResult[]> {
  console.warn('getDistributionHistory: incomeDistribution model not available in Prisma schema');
  return [];
  
  /*
  const prisma = getPrismaClient();
  const whereClause: { propertyId: string; periodStart?: { gte: Date; lt: Date } } = { propertyId };
  
  if (year) {
    whereClause.periodStart = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${year + 1}-01-01`),
    };
  }

  const distributions = await prisma.incomeDistribution.findMany({
    where: whereClause,
    include: {
      shares: {
        include: {
          owner: true,
        },
      },
      calculatedBy: true,
      recalculatedBy: true,
    },
    orderBy: [{ periodStart: 'desc' }, { version: 'desc' }],
  });

  return distributions.map((d: {
    id: string;
    propertyId: string;
    periodStart: Date;
    periodEnd: Date;
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    taxMode: string;
    version: number;
    calculatedAt: Date;
    calculatedByUserId: string;
    shares: Array<{
      ownerId: string;
      owner?: { name: string } | null;
      percentage: number;
      grossShare: number;
      taxAmount: number;
      netShare: number;
      taxCountry: string | null;
      taxRate: number | null;
    }>;
  }) => ({
    id: d.id,
    propertyId: d.propertyId,
    periodStart: d.periodStart,
    periodEnd: d.periodEnd,
    totalIncome: d.totalIncome,
    totalExpenses: d.totalExpenses,
    netIncome: d.netIncome,
    taxMode: d.taxMode as TaxMode,
    shares: d.shares.map((s: {
      ownerId: string;
      owner?: { name: string } | null;
      percentage: number;
      grossShare: number;
      taxAmount: number;
      netShare: number;
      taxCountry: string | null;
      taxRate: number | null;
    }) => ({
      ownerId: s.ownerId,
      ownerName: s.owner?.name || 'Unknown',
      percentage: s.percentage,
      grossShare: s.grossShare,
      taxableIncome: s.grossShare, // Simplified
      taxAmount: s.taxAmount,
      netShare: s.netShare,
      taxCountry: s.taxCountry || 'Portugal',
      effectiveRate: s.taxRate || 0,
      taxDetails: {} as TaxCalculationResult, // Would need to recalculate
    })),
    totalTax: d.shares.reduce((sum: number, s: { taxAmount: number }) => sum + s.taxAmount, 0),
    totalNetDistributed: d.shares.reduce((sum: number, s: { netShare: number }) => sum + s.netShare, 0),
    version: d.version,
    calculatedAt: d.calculatedAt,
    calculatedByUserId: d.calculatedByUserId,
  }));
  */
}

/**
 * Get annual summary for tax reporting
 * TODO: Requires incomeDistributionShare model in Prisma schema
 */
export async function getAnnualTaxSummary(
  ownerId: string,
  year: number
): Promise<{
  ownerId: string;
  year: number;
  totalGrossIncome: number;
  totalTaxPaid: number;
  totalNetIncome: number;
  distributions: { propertyId: string; period: string; grossShare: number; taxAmount: number; netShare: number }[];
}> {
  console.warn('getAnnualTaxSummary: incomeDistributionShare model not available in Prisma schema');
  return {
    ownerId,
    year,
    totalGrossIncome: 0,
    totalTaxPaid: 0,
    totalNetIncome: 0,
    distributions: [],
  };
  
  /*
  interface ShareWithDistribution {
    grossShare: number;
    taxAmount: number;
    netShare: number;
    distribution: {
      propertyId: string;
      periodStart: Date;
      periodEnd: Date;
    };
  }

  const prisma = getPrismaClient();
  const shares: ShareWithDistribution[] = await prisma.incomeDistributionShare.findMany({
    where: {
      ownerId,
      distribution: {
        periodStart: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    },
    include: {
      distribution: true,
    },
  });

  const distributions = shares.map((s: ShareWithDistribution) => ({
    propertyId: s.distribution.propertyId,
    period: `${s.distribution.periodStart.toISOString().slice(0, 7)} - ${s.distribution.periodEnd.toISOString().slice(0, 7)}`,
    grossShare: s.grossShare,
    taxAmount: s.taxAmount,
    netShare: s.netShare,
  }));

  return {
    ownerId,
    year,
    totalGrossIncome: shares.reduce((sum: number, s: ShareWithDistribution) => sum + s.grossShare, 0),
    totalTaxPaid: shares.reduce((sum: number, s: ShareWithDistribution) => sum + s.taxAmount, 0),
    totalNetIncome: shares.reduce((sum: number, s: ShareWithDistribution) => sum + s.netShare, 0),
    distributions,
  };
  */
}

/**
 * Generate tax form data for Portugal (Modelo 3 Anexo F)
 */
export function generatePortugalTaxForm(
  annualSummary: Awaited<ReturnType<typeof getAnnualTaxSummary>>
): {
  form: string;
  year: number;
  fields: Record<string, number | string>;
} {
  return {
    form: 'Modelo 3 - Anexo F',
    year: annualSummary.year,
    fields: {
      'Campo 401': annualSummary.totalGrossIncome, // Rendimentos brutos
      'Campo 402': 0, // Despesas (already deducted)
      'Campo 403': annualSummary.totalGrossIncome, // Rendimento líquido
      'Campo 404': annualSummary.totalTaxPaid, // Imposto retido
      NIF: 'TO BE FILLED BY OWNER',
    },
  };
}

/**
 * Generate tax form data for Spain (Modelo 100)
 */
export function generateSpainTaxForm(
  annualSummary: Awaited<ReturnType<typeof getAnnualTaxSummary>>
): {
  form: string;
  year: number;
  fields: Record<string, number | string>;
} {
  return {
    form: 'Modelo 100 - IRPF',
    year: annualSummary.year,
    fields: {
      'Casilla 063': annualSummary.totalGrossIncome, // Rendimientos íntegros
      'Casilla 064': 0, // Gastos deducibles
      'Casilla 065': annualSummary.totalGrossIncome, // Rendimiento neto
      'Casilla 595': annualSummary.totalTaxPaid, // Cuota íntegra
      NIF: 'TO BE FILLED BY OWNER',
    },
  };
}

export default {
  calculateDistribution,
  saveDistribution,
  getDistributionHistory,
  getAnnualTaxSummary,
  generatePortugalTaxForm,
  generateSpainTaxForm,
};
