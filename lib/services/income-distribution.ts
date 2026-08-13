/**
 * Income Distribution Service
 *
 * Handles multi-owner income splitting with tax calculations
 * Supports pre-tax and post-tax distribution modes
 * Includes audit trail for recalculations
 */

import { TaxCalculator, TaxCalculationInput, TaxCalculationResult } from "./tax-calculator";
import { resolveCountryCode } from "@/lib/utils/country";
import { getPrismaClient } from "@/lib/services/database/database";
import { ResourceNotFoundError } from "@/lib/utils/error-handling";

export type TaxMode = "pre-tax" | "post-tax";
export type DistributionFrequency = "monthly" | "quarterly" | "annually";

// Map between app-level TaxMode and Prisma enum
const taxModeToPrisma: Record<TaxMode, string> = {
  "pre-tax": "PRE_TAX",
  "post-tax": "POST_TAX",
};
const prismaToTaxMode: Record<string, TaxMode> = {
  PRE_TAX: "pre-tax",
  POST_TAX: "post-tax",
};

export interface OwnerShareConfig {
  ownerId: string;
  ownerName: string;
  percentage: number; // 0-100
  taxCountry: "Portugal" | "Spain";
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
      country: resolveCountryCode(owner.taxCountry),
      regime:
        resolveCountryCode(owner.taxCountry) === "PT" ? "portugal_rendimentos" : "spain_inmuebles",
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
 */
export async function saveDistribution(
  distribution: DistributionResult,
  userId: string,
): Promise<DistributionResult> {
  const prisma = getPrismaClient();

  // Both the propertyId and every ownerId arrive from the request body, so neither can be
  // trusted. Before this check a caller could write an IncomeDistribution — with amounts of
  // their choosing — against another landlord's property, and attach shares to another
  // landlord's owners. `calculatedByUserId` recorded who did it but constrained nothing.
  //
  // Same shape as app/api/property-owners/route.ts, which already validates both sides.
  const property = await prisma.property.findFirst({
    where: { id: distribution.propertyId, userId },
    select: { id: true },
  });
  if (!property) {
    throw new ResourceNotFoundError("Property not found");
  }

  const ownerIds = [...new Set(distribution.shares.map((s) => s.ownerId))];
  const owners = await prisma.owner.findMany({
    where: { id: { in: ownerIds }, userId },
    select: { id: true },
  });
  if (owners.length !== ownerIds.length) {
    // Deliberately not naming which id failed — that would confirm the existence of ids the
    // caller does not own.
    throw new ResourceNotFoundError("Owner not found");
  }

  // Check for existing distribution in this period. Scoped too: an unscoped read here would
  // let the version counter reveal whether a distribution exists on someone else's property.
  const existing = await prisma.incomeDistribution.findFirst({
    where: {
      propertyId: distribution.propertyId,
      property: { userId },
      periodStart: distribution.periodStart,
      periodEnd: distribution.periodEnd,
    },
    orderBy: { version: "desc" },
  });

  const version = existing ? existing.version + 1 : 1;

  // Create the distribution record
  const created = await prisma.incomeDistribution.create({
    data: {
      propertyId: distribution.propertyId,
      periodStart: distribution.periodStart,
      periodEnd: distribution.periodEnd,
      taxMode: taxModeToPrisma[distribution.taxMode] as "PRE_TAX" | "POST_TAX",
      totalIncome: distribution.totalIncome,
      totalExpenses: distribution.totalExpenses,
      netIncome: distribution.netIncome,
      version,
      calculatedByUserId: distribution.calculatedByUserId,
      recalculatedByUserId: existing ? distribution.calculatedByUserId : null,
      recalculatedAt: existing ? new Date() : null,
      shares: {
        create: distribution.shares.map((share) => ({
          ownerId: share.ownerId,
          ownershipPercentage: share.percentage,
          grossShare: share.grossShare,
          taxAmount: share.taxAmount,
          netShare: share.netShare,
          taxCountry: share.taxCountry,
          taxRate: share.effectiveRate,
          owner: { connect: { id: share.ownerId } },
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
}

/**
 * Get distribution history for a property (audit trail).
 *
 * `userId` is REQUIRED and not optional-with-a-default on purpose. This query used to be
 * `where: { propertyId }` with the id coming straight off a query string, so any signed-in
 * user who knew another landlord's propertyId could read that property's full income
 * distribution — income, expenses, and every owner's name, gross share, tax and net share.
 * A session proved someone was logged in; it never proved whose property this was.
 *
 * Scoping lives here rather than only in the route so the compiler enforces it: a future
 * caller cannot forget an argument that does not exist.
 */
export async function getDistributionHistory(
  propertyId: string,
  userId: string,
  year?: number,
): Promise<DistributionResult[]> {
  const prisma = getPrismaClient();
  const whereClause: {
    propertyId: string;
    property: { userId: string };
    periodStart?: { gte: Date; lt: Date };
  } = { propertyId, property: { userId } };

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
    },
    orderBy: [{ periodStart: "desc" }, { version: "desc" }],
  });

  return distributions.map((d) => ({
    id: d.id,
    propertyId: d.propertyId,
    periodStart: d.periodStart,
    periodEnd: d.periodEnd,
    totalIncome: d.totalIncome,
    totalExpenses: d.totalExpenses,
    netIncome: d.netIncome,
    taxMode: (prismaToTaxMode[d.taxMode] || "pre-tax") as TaxMode,
    shares: d.shares.map((s) => ({
      ownerId: s.ownerId,
      ownerName: s.owner?.name || "Unknown",
      percentage: s.ownershipPercentage,
      grossShare: s.grossShare,
      taxableIncome: s.grossShare,
      taxAmount: s.taxAmount,
      netShare: s.netShare,
      taxCountry: s.taxCountry || "Portugal",
      effectiveRate: s.taxRate || 0,
      taxDetails: {} as TaxCalculationResult,
    })),
    totalTax: d.shares.reduce((sum, s) => sum + s.taxAmount, 0),
    totalNetDistributed: d.shares.reduce((sum, s) => sum + s.netShare, 0),
    version: d.version,
    calculatedAt: d.createdAt,
    calculatedByUserId: d.calculatedByUserId,
  }));
}

/**
 * Get annual summary for tax reporting
 */
/**
 * Annual tax summary for one owner.
 *
 * `userId` is required for the same reason as getDistributionHistory — this ran as
 * `where: { ownerId }` against a query-string id and leaked any owner's gross income, tax
 * paid and per-property breakdown to any authenticated caller.
 *
 * Both sides are scoped deliberately. `owner: { userId }` is the semantically correct
 * constraint (it is that owner's summary, and owners belong to a user), while
 * `distribution.property.userId` also excludes any share row that a caller may have injected
 * against someone else's distribution through the POST hole that existed alongside this one.
 */
export async function getAnnualTaxSummary(
  ownerId: string,
  userId: string,
  year: number,
): Promise<{
  ownerId: string;
  year: number;
  totalGrossIncome: number;
  totalTaxPaid: number;
  totalNetIncome: number;
  distributions: {
    propertyId: string;
    period: string;
    grossShare: number;
    taxAmount: number;
    netShare: number;
  }[];
}> {
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
      owner: { userId },
      distribution: {
        property: { userId },
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
    totalGrossIncome: shares.reduce(
      (sum: number, s: ShareWithDistribution) => sum + s.grossShare,
      0,
    ),
    totalTaxPaid: shares.reduce((sum: number, s: ShareWithDistribution) => sum + s.taxAmount, 0),
    totalNetIncome: shares.reduce((sum: number, s: ShareWithDistribution) => sum + s.netShare, 0),
    distributions,
  };
}

/**
 * Generate tax form data for Portugal (Modelo 3 Anexo F)
 */
export function generatePortugalTaxForm(
  annualSummary: Awaited<ReturnType<typeof getAnnualTaxSummary>>,
): {
  form: string;
  year: number;
  fields: Record<string, number | string>;
} {
  return {
    form: "Modelo 3 - Anexo F",
    year: annualSummary.year,
    fields: {
      "Campo 401": annualSummary.totalGrossIncome, // Rendimentos brutos
      "Campo 402": 0, // Despesas (already deducted)
      "Campo 403": annualSummary.totalGrossIncome, // Rendimento líquido
      "Campo 404": annualSummary.totalTaxPaid, // Imposto retido
      NIF: "TO BE FILLED BY OWNER",
    },
  };
}

/**
 * Generate tax form data for Spain (Modelo 100)
 */
export function generateSpainTaxForm(
  annualSummary: Awaited<ReturnType<typeof getAnnualTaxSummary>>,
): {
  form: string;
  year: number;
  fields: Record<string, number | string>;
} {
  return {
    form: "Modelo 100 - IRPF",
    year: annualSummary.year,
    fields: {
      "Casilla 063": annualSummary.totalGrossIncome, // Rendimientos íntegros
      "Casilla 064": 0, // Gastos deducibles
      "Casilla 065": annualSummary.totalGrossIncome, // Rendimiento neto
      "Casilla 595": annualSummary.totalTaxPaid, // Cuota íntegra
      NIF: "TO BE FILLED BY OWNER",
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
