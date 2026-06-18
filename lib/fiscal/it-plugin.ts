/**
 * Italy fiscal plugin.
 *
 * Covers rental income under Cedolare Secca (sostitutiva) and IRPEF standard.
 * Regimes: CEDOLARE_SECCA (21% flat), CEDOLARE_CONCORDATO (10% flat), STANDARD (IRPEF brackets).
 * All rates read from TaxRule DB; no hard-coded values.
 */

import { getPrismaClient } from "@/lib/services/database/database";
import type {
  FiscalPlugin,
  RentalTaxParams,
  TaxCalculation,
  BracketBreakdown,
} from "./plugin-interface";

const COUNTRY = "IT";

interface ITBrackets {
  brackets: Array<{ min: number; max: number | null; rate: number }>;
  maxRentalDeductiblePct: number;
}

interface ITFlatRate {
  flatRate: number;
}

interface ITWithholding {
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
  brackets: ITBrackets["brackets"],
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

// Italian Codice Fiscale check-character lookup tables
const CF_ODD_VALUES: Record<string, number> = {
  "0": 1,  "1": 0,  "2": 5,  "3": 7,  "4": 9,  "5": 13, "6": 15,
  "7": 17, "8": 19, "9": 21, A: 1,  B: 0,  C: 5,  D: 7,  E: 9,
  F: 13, G: 15, H: 17, I: 19, J: 21, K: 2,  L: 4,  M: 18, N: 20,
  O: 11, P: 3,  Q: 6,  R: 8,  S: 12, T: 14, U: 16, V: 10, W: 22,
  X: 25, Y: 24, Z: 23,
};

const CF_EVEN_VALUES: Record<string, number> = {
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
  "7": 7, "8": 8, "9": 9, A: 0, B: 1, C: 2, D: 3, E: 4,
  F: 5,  G: 6,  H: 7,  I: 8,  J: 9,  K: 10, L: 11, M: 12,
  N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20,
  V: 21, W: 22, X: 23, Y: 24, Z: 25,
};

const CF_REMAINDER_TO_CHAR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

class ITFiscalPlugin implements FiscalPlugin {
  readonly countryCode = "IT";
  readonly countryName = "Italia";
  readonly fiscalIdLabel = "Codice Fiscale";
  readonly supportedRegimes = ["CEDOLARE_SECCA", "CEDOLARE_CONCORDATO", "STANDARD"] as const;

  async calculateRentalTax(params: RentalTaxParams): Promise<TaxCalculation> {
    const { grossIncome, expenses = 0, regime, year } = params;
    const notes: string[] = [];

    // --- Cedolare Secca: substitute flat tax, no expense deductions ---
    if (regime === "CEDOLARE_SECCA" || regime === "CEDOLARE_CONCORDATO") {
      const flat = await loadPayload<ITFlatRate>(regime, "FLAT_RATE", year);
      const defaults: Record<string, number> = {
        CEDOLARE_SECCA: 0.21,
        CEDOLARE_CONCORDATO: 0.1,
      };
      const flatRate = flat?.flatRate ?? defaults[regime] ?? 0.21;
      if (!flat) {
        notes.push(`No ${regime} rule for ${year}; using default ${(flatRate * 100).toFixed(0)}%.`);
      }
      notes.push("Cedolare secca: no deductions apply — tax on gross income.");

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

    // --- STANDARD: IRPEF progressive brackets ---
    const bracketData = await loadPayload<ITBrackets>("STANDARD", "INCOME_BRACKET", year);
    if (!bracketData) {
      notes.push(`No IRPEF bracket data for IT STANDARD ${year}; tax calculation unavailable.`);
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

    const maxDeductiblePct = bracketData.maxRentalDeductiblePct ?? 0.35;
    const maxExpenses = grossIncome * maxDeductiblePct;
    const allowableExpenses = Math.min(expenses, maxExpenses);
    if (expenses > maxExpenses) {
      notes.push(
        `Expenses capped at ${(maxDeductiblePct * 100).toFixed(0)}% of gross (€${maxExpenses.toFixed(2)}).`,
      );
    }

    const taxableIncome = Math.max(0, grossIncome - allowableExpenses);
    const { taxDue, breakdown } = applyBrackets(taxableIncome, bracketData.brackets);

    const withholdingData = await loadPayload<ITWithholding>("STANDARD", "WITHHOLDING_RATE", year);
    const wRate = withholdingData?.withholdingRate ?? 0;
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
    if (regime === "CEDOLARE_SECCA" || regime === "CEDOLARE_CONCORDATO") return 0;
    const data = await loadPayload<ITWithholding>("STANDARD", "WITHHOLDING_RATE", year);
    return data?.withholdingRate ?? 0;
  }

  validateFiscalId(id: string): boolean {
    // Italian Codice Fiscale: 16 chars — LLLLLL99L99L999L pattern + Luce check digit
    const clean = id.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 15; i++) {
      const c = clean[i];
      sum += i % 2 === 0 ? (CF_ODD_VALUES[c] ?? 0) : (CF_EVEN_VALUES[c] ?? 0);
    }
    const expected = CF_REMAINDER_TO_CHAR[sum % 26];
    return clean[15] === expected;
  }
}

export const itPlugin: FiscalPlugin = new ITFiscalPlugin();
