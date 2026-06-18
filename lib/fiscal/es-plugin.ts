/**
 * Spain fiscal plugin.
 *
 * Covers rental income (Rendimientos del capital inmobiliario) under IRPF.
 * Regimes: STANDARD (residents), NHR (non-resident IRNR).
 * All rates read from the TaxRule DB.
 */

import { getPrismaClient } from "@/lib/services/database/database";
import type {
  FiscalPlugin,
  RentalTaxParams,
  TaxCalculation,
  BracketBreakdown,
} from "./plugin-interface";

const COUNTRY = "ES";

interface ESBrackets {
  brackets: Array<{ min: number; max: number | null; rate: number }>;
  rentalExpenseDeductionPct: number;
}

interface ESFlatRate {
  euEeaRate: number;
  nonEuRate: number;
}

interface ESWithholding {
  withholdingRate: number;
}

async function loadPayload<T>(
  regime: string,
  ruleType: string,
  year: number,
): Promise<T | null> {
  const prisma = getPrismaClient();
  const rule = await prisma.taxRule.findFirst({
    where: { country: COUNTRY, regime, ruleType, year },
    orderBy: { effectiveDate: "desc" },
  });
  if (!rule) return null;
  try {
    return JSON.parse(rule.payload) as T;
  } catch {
    return null;
  }
}

function applyBrackets(
  taxableIncome: number,
  brackets: ESBrackets["brackets"],
): { taxDue: number; breakdown: BracketBreakdown[] } {
  let taxDue = 0;
  const breakdown: BracketBreakdown[] = [];
  for (const b of brackets) {
    if (taxableIncome <= b.min) break;
    const upper = b.max ?? Infinity;
    const inBracket = Math.min(taxableIncome, upper) - b.min;
    const taxInBracket = inBracket * b.rate;
    taxDue += taxInBracket;
    breakdown.push({
      min: b.min,
      max: b.max,
      rate: b.rate,
      taxableInThisBracket: inBracket,
      taxInThisBracket: taxInBracket,
    });
  }
  return { taxDue, breakdown };
}

class ESFiscalPlugin implements FiscalPlugin {
  readonly countryCode = "ES";
  readonly countryName = "Spain";
  readonly fiscalIdLabel = "NIE/NIF";
  readonly supportedRegimes = ["STANDARD", "NHR"] as const;

  async calculateRentalTax(params: RentalTaxParams): Promise<TaxCalculation> {
    // Spain: deduction is a % of gross income — actual expenses param is intentionally unused
    const { grossIncome, regime, year } = params;
    const notes: string[] = [];

    // --- Non-resident (IRNR): flat rate, no expense deduction ---
    if (regime === "NHR") {
      const flat = await loadPayload<ESFlatRate>("NHR", "FLAT_RATE", year);
      // Default to EU/EEA rate (most self-hosters will be EU residents)
      const flatRate = flat?.euEeaRate ?? 0.19;
      if (!flat) notes.push(`No IRNR flat rate found for ES ${year}; using default 19%.`);

      const taxDue = grossIncome * flatRate;

      return {
        grossIncome,
        allowableExpenses: 0,
        taxableIncome: grossIncome,
        taxDue,
        effectiveRate: grossIncome > 0 ? taxDue / grossIncome : 0,
        withholdingRate: 0,
        withholdingAlreadyPaid: 0,
        balanceDue: taxDue,
        bracketBreakdown: [],
        regime,
        year,
        notes,
      };
    }

    // --- STANDARD (IRPF resident): 60% expense deduction ---
    const bracketData = await loadPayload<ESBrackets>("STANDARD", "INCOME_BRACKET", year);
    if (!bracketData) {
      notes.push(`No income bracket data for ES STANDARD ${year}; tax calculation unavailable.`);
      return {
        grossIncome,
        allowableExpenses: 0,
        taxableIncome: grossIncome,
        taxDue: 0,
        effectiveRate: 0,
        withholdingRate: 0,
        withholdingAlreadyPaid: 0,
        balanceDue: 0,
        bracketBreakdown: [],
        regime,
        year,
        notes,
      };
    }

    const deductionPct = bracketData.rentalExpenseDeductionPct ?? 0.6;
    notes.push(
      `Standard rental expense deduction: ${(deductionPct * 100).toFixed(0)}% of gross income.`,
    );

    // Spain: deduction is a % of gross, not capped by actual expenses
    const allowableExpenses = grossIncome * deductionPct;
    const taxableIncome = Math.max(0, grossIncome - allowableExpenses);
    const { taxDue, breakdown } = applyBrackets(taxableIncome, bracketData.brackets);

    const withholdingData = await loadPayload<ESWithholding>("STANDARD", "WITHHOLDING_RATE", year);
    const wRate = withholdingData?.withholdingRate ?? 0.19;
    const withholdingAlreadyPaid = grossIncome * wRate;

    return {
      grossIncome,
      allowableExpenses,
      taxableIncome,
      taxDue,
      effectiveRate: grossIncome > 0 ? taxDue / grossIncome : 0,
      withholdingRate: wRate,
      withholdingAlreadyPaid,
      balanceDue: taxDue - withholdingAlreadyPaid,
      bracketBreakdown: breakdown,
      regime,
      year,
      notes,
    };
  }

  async getWithholdingRate(_regime: string, year: number): Promise<number> {
    const data = await loadPayload<ESWithholding>("STANDARD", "WITHHOLDING_RATE", year);
    return data?.withholdingRate ?? 0.19;
  }

  validateFiscalId(id: string): boolean {
    const clean = id.toUpperCase().replace(/\s/g, "");
    // NIF (residents): 8 digits + 1 letter
    if (/^\d{8}[A-HJ-NP-TV-Z]$/.test(clean)) {
      const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
      const expected = letters[parseInt(clean.slice(0, 8), 10) % 23];
      return clean[8] === expected;
    }
    // NIE (foreigners): X/Y/Z + 7 digits + letter
    if (/^[XYZ]\d{7}[A-HJ-NP-TV-Z]$/.test(clean)) {
      const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
      const prefix = { X: "0", Y: "1", Z: "2" }[clean[0]] ?? "0";
      const num = parseInt(prefix + clean.slice(1, 8), 10);
      const expected = letters[num % 23];
      return clean[8] === expected;
    }
    return false;
  }
}

export const esPlugin: FiscalPlugin = new ESFiscalPlugin();
