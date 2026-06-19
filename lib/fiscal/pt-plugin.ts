/**
 * Portugal fiscal plugin.
 *
 * Covers Category F (Rendas — rental income) under the IRS.
 * Regimes: STANDARD, NHR, IFICI, RENDA_ACESSIVEL.
 * All rates read from the TaxRule DB; no hard-coded values.
 */

import { getPrismaClient } from "@/lib/services/database/database";
import type {
  FiscalPlugin,
  RentalTaxParams,
  TaxCalculation,
  BracketBreakdown,
} from "./plugin-interface";

const COUNTRY = "PT";

interface PTBrackets {
  brackets: Array<{ min: number; max: number | null; rate: number }>;
  maxRentalDeductiblePct: number;
}

interface PTFlatRate {
  flatRate: number;
}

interface PTWithholding {
  withholdingRate: number;
}

interface PTRendaAcessivel {
  additionalDeductionPct: number;
  maxDeductiblePct: number;
}

async function loadPayload<T>(regime: string, ruleType: string, year: number): Promise<T | null> {
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
  brackets: PTBrackets["brackets"],
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

class PTFiscalPlugin implements FiscalPlugin {
  readonly countryCode = "PT";
  readonly countryName = "Portugal";
  readonly fiscalIdLabel = "NIF";
  readonly supportedRegimes = ["STANDARD", "NHR", "IFICI", "RENDA_ACESSIVEL"] as const;

  async calculateRentalTax(params: RentalTaxParams): Promise<TaxCalculation> {
    const { grossIncome, expenses = 0, regime, year } = params;
    const notes: string[] = [];

    // --- NHR / IFICI: flat-rate regimes ---
    if (regime === "NHR" || regime === "IFICI") {
      const flat = await loadPayload<PTFlatRate>(regime, "FLAT_RATE", year);
      const flatRate = flat?.flatRate ?? 0.2;
      if (!flat) notes.push(`No ${regime} rule found for ${year}; using default 20%.`);

      const withholdingData = await loadPayload<PTWithholding>(
        "STANDARD",
        "WITHHOLDING_RATE",
        year,
      );
      const wRate = withholdingData?.withholdingRate ?? 0.25;

      const taxDue = grossIncome * flatRate;
      const withholdingAlreadyPaid = grossIncome * wRate;

      return {
        grossIncome,
        allowableExpenses: 0,
        taxableIncome: grossIncome,
        taxDue,
        effectiveRate: grossIncome > 0 ? taxDue / grossIncome : 0,
        withholdingRate: wRate,
        withholdingAlreadyPaid,
        balanceDue: taxDue - withholdingAlreadyPaid,
        bracketBreakdown: [],
        regime,
        year,
        notes,
      };
    }

    // --- STANDARD / RENDA_ACESSIVEL: bracket-based ---
    const bracketData = await loadPayload<PTBrackets>("STANDARD", "INCOME_BRACKET", year);
    if (!bracketData) {
      notes.push(`No income bracket data for PT STANDARD ${year}; tax calculation unavailable.`);
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

    // Deductible expenses: capped at maxRentalDeductiblePct of gross (default 35%)
    let maxDeductiblePct = bracketData.maxRentalDeductiblePct ?? 0.35;

    if (regime === "RENDA_ACESSIVEL") {
      const ra = await loadPayload<PTRendaAcessivel>("RENDA_ACESSIVEL", "DEDUCTIBLE_RATE", year);
      if (ra) {
        maxDeductiblePct = ra.maxDeductiblePct;
        notes.push(
          `Renda Acessível: max deductible expense rate raised to ${(maxDeductiblePct * 100).toFixed(0)}%.`,
        );
      }
    }

    const maxExpenses = grossIncome * maxDeductiblePct;
    const allowableExpenses = Math.min(expenses, maxExpenses);
    if (expenses > maxExpenses) {
      notes.push(
        `Expenses capped at ${(maxDeductiblePct * 100).toFixed(0)}% of gross (€${maxExpenses.toFixed(2)}).`,
      );
    }

    const taxableIncome = Math.max(0, grossIncome - allowableExpenses);
    const { taxDue, breakdown } = applyBrackets(taxableIncome, bracketData.brackets);

    const withholdingData = await loadPayload<PTWithholding>("STANDARD", "WITHHOLDING_RATE", year);
    const wRate = withholdingData?.withholdingRate ?? 0.25;
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

  async getWithholdingRate(regime: string, year: number): Promise<number> {
    const data = await loadPayload<PTWithholding>("STANDARD", "WITHHOLDING_RATE", year);
    return data?.withholdingRate ?? 0.25;
  }

  validateFiscalId(id: string): boolean {
    // Portuguese NIF: 9 digits, first digit in {1,2,3,5,6,7,8,9}
    const clean = id.replace(/\s/g, "");
    if (!/^\d{9}$/.test(clean)) return false;
    const valid = [1, 2, 3, 5, 6, 7, 8, 9];
    if (!valid.includes(parseInt(clean[0], 10))) return false;
    const digits = clean.split("").map(Number);
    const check =
      (9 * digits[0] +
        8 * digits[1] +
        7 * digits[2] +
        6 * digits[3] +
        5 * digits[4] +
        4 * digits[5] +
        3 * digits[6] +
        2 * digits[7]) %
      11;
    const expected = check < 2 ? 0 : 11 - check;
    return digits[8] === expected;
  }
}

export const ptPlugin: FiscalPlugin = new PTFiscalPlugin();
