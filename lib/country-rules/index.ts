import { type CountryCode } from "@/lib/utils/country";
import { ptRules } from "./pt";
import { esRules } from "./es";

export interface CountryRules {
  code: CountryCode;
  taxBrackets: Array<{ min: number; max: number; rate: number }>;
  deductionCaps: {
    maxExpenseDeductionPct: number; // e.g. 0.15 for PT, 0.5 for ES
    ownershipBonusPerYear?: number; // PT only: 0.05
    maxOwnershipBonus?: number; // PT only: 0.15
  };
  leaseDefaults: {
    minDurationMonths: number; // PT: 12, ES: 60 (LAU 5 years)
    noticePeriodDays: number; // PT: 120, ES: 30
    securityDepositMonths: number; // PT: 2, ES: 1 (fianza)
    rentUpdateIndex: string; // PT: "INE Consumer Price Index", ES: "INE/IGC Reference Index"
  };
  compliance: {
    taxIdName: string; // PT: "NIF", ES: "NIF/NIE"
    taxIdFormat: RegExp;
    postalCodeFormat: RegExp;
    rentReceiptRequired: boolean; // PT: true (recibos eletrónicos), ES: false
    contractRegistrationRequired: boolean; // PT: false, ES: true (NRUA from 2026)
  };
  paymentMethods: string[]; // PT: ["multibanco", "mb_way", "bank_transfer"], ES: ["bank_transfer", "bizum"]
}

const RULES_REGISTRY: Record<CountryCode, CountryRules> = {
  PT: ptRules,
  ES: esRules,
};

export function getCountryRules(code: CountryCode): CountryRules {
  const rules = RULES_REGISTRY[code];
  if (!rules) throw new Error(`No rules configured for country: ${code}`);
  return rules;
}

export function getAllCountryRules(): CountryRules[] {
  return Object.values(RULES_REGISTRY);
}
