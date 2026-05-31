import { type CountryRules } from "./index";

export const esRules: CountryRules = {
  code: "ES",
  taxBrackets: [
    { min: 0, max: 12450, rate: 0.19 },
    { min: 12450, max: 20200, rate: 0.24 },
    { min: 20200, max: 35200, rate: 0.3 },
    { min: 35200, max: 60000, rate: 0.37 },
    { min: 60000, max: 300000, rate: 0.45 },
    { min: 300000, max: Infinity, rate: 0.47 },
  ],
  deductionCaps: {
    maxExpenseDeductionPct: 0.5,
  },
  leaseDefaults: {
    minDurationMonths: 60,
    noticePeriodDays: 30,
    securityDepositMonths: 1,
    rentUpdateIndex: "INE/IGC Reference Index",
  },
  compliance: {
    taxIdName: "NIF/NIE",
    taxIdFormat: /^[XYZ]?\d{7,8}[A-Z]$/,
    postalCodeFormat: /^\d{5}$/,
    rentReceiptRequired: false,
    contractRegistrationRequired: true,
  },
  paymentMethods: ["bank_transfer", "bizum"],
};
