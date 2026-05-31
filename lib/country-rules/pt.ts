import { type CountryRules } from "./index";

export const ptRules: CountryRules = {
  code: "PT",
  taxBrackets: [
    { min: 0, max: 7703, rate: 0.1325 },
    { min: 7703, max: 11623, rate: 0.18 },
    { min: 11623, max: 16472, rate: 0.23 },
    { min: 16472, max: 21321, rate: 0.26 },
    { min: 21321, max: 27146, rate: 0.3275 },
    { min: 27146, max: 39791, rate: 0.37 },
    { min: 39791, max: 51997, rate: 0.435 },
    { min: 51997, max: 81199, rate: 0.45 },
    { min: 81199, max: Infinity, rate: 0.48 },
  ],
  deductionCaps: {
    maxExpenseDeductionPct: 0.15,
    ownershipBonusPerYear: 0.05,
    maxOwnershipBonus: 0.15,
  },
  leaseDefaults: {
    minDurationMonths: 12,
    noticePeriodDays: 120,
    securityDepositMonths: 2,
    rentUpdateIndex: "INE Consumer Price Index",
  },
  compliance: {
    taxIdName: "NIF",
    taxIdFormat: /^\d{9}$/,
    postalCodeFormat: /^\d{4}-\d{3}$/,
    rentReceiptRequired: true,
    contractRegistrationRequired: false,
  },
  paymentMethods: ["multibanco", "mb_way", "bank_transfer"],
};
