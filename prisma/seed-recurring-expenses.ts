/**
 * seed-recurring-expenses.ts
 *
 * Reference shapes for common Portuguese landlord recurring expense templates.
 * These are NOT automatically inserted — they serve as documentation and can be
 * adapted by running them manually with `npx ts-node prisma/seed-recurring-expenses.ts`
 * after updating the propertyId values to match your actual properties.
 *
 * Wave 2.4 — Recurring Expense Templates
 */

// Shape of a recurring expense template (mirrors Prisma Expense model)
interface RecurringExpenseTemplate {
  propertyId: string; // Replace with real property ID
  userId: string; // Replace with real user ID
  amount: number;
  date: string; // ISO date — the "anchor" date (used to determine recurrence month)
  category: string;
  description: string;
  isDeductible: boolean;
  vendorName?: string;
  isRecurring: true;
  recurrenceRule: "monthly" | "quarterly" | "annual";
  recurrenceDay: number; // 1–28 — day of month to generate the expense
  recurrenceEnd: null; // null = indefinite
}

/**
 * IMI — Imposto Municipal sobre Imóveis
 * Portugal's municipal property tax, payable once a year (typically April).
 * Rate varies by municipality and property value (VPT × rate, usually 0.3–0.45%).
 */
export const imiTemplate: RecurringExpenseTemplate = {
  propertyId: "REPLACE_WITH_PROPERTY_ID",
  userId: "REPLACE_WITH_USER_ID",
  amount: 450.0, // Example: replace with actual assessed amount
  date: "2025-04-01", // Anchor month: April
  category: "imi",
  description: "IMI annual property tax payment",
  isDeductible: true,
  isRecurring: true,
  recurrenceRule: "annual",
  recurrenceDay: 1,
  recurrenceEnd: null,
};

/**
 * Condominium Fee — Quota de Condomínio
 * Monthly fee for building common expenses (cleaning, elevator, insurance, etc.).
 * Highly variable — check your condominium's budget (orçamento anual).
 */
export const condominiumFeeTemplate: RecurringExpenseTemplate = {
  propertyId: "REPLACE_WITH_PROPERTY_ID",
  userId: "REPLACE_WITH_USER_ID",
  amount: 120.0, // Example: replace with your actual monthly quota
  date: "2025-01-01", // Anchor month: January (monthly, so any month works)
  category: "condominium_fees",
  description: "Monthly condominium fee",
  isDeductible: true,
  vendorName: "Condomínio do Edifício",
  isRecurring: true,
  recurrenceRule: "monthly",
  recurrenceDay: 1,
  recurrenceEnd: null,
};

/**
 * Building Insurance — Seguro Multirriscos Habitação
 * Annual building/structure insurance premium. Required for mortgage properties.
 * Deductible as a landlord expense under Categoria F (IRS) and IRPF (ES).
 */
export const buildingInsuranceTemplate: RecurringExpenseTemplate = {
  propertyId: "REPLACE_WITH_PROPERTY_ID",
  userId: "REPLACE_WITH_USER_ID",
  amount: 280.0, // Example: replace with actual premium
  date: "2025-01-01", // Anchor month: January (policy renewal month)
  category: "building_insurance",
  description: "Annual building insurance (seguro multirriscos)",
  isDeductible: true,
  vendorName: "Insurance Company",
  isRecurring: true,
  recurrenceRule: "annual",
  recurrenceDay: 15,
  recurrenceEnd: null,
};

/**
 * Accountant / TOC Fees — Honorários do Contabilista
 * Annual fee for certified accountant (TOC — Técnico Oficial de Contas) for
 * IRS filing (Modelo 3, Anexo F) and fiscal representation.
 * Typically billed in March–April during IRS season.
 */
export const accountantFeeTemplate: RecurringExpenseTemplate = {
  propertyId: "REPLACE_WITH_PROPERTY_ID",
  userId: "REPLACE_WITH_USER_ID",
  amount: 200.0, // Example: replace with actual accountant fee
  date: "2025-03-01", // Anchor month: March (IRS filing period)
  category: "accountant_fees",
  description: "Annual TOC / accountant fee for IRS filing (Modelo 3)",
  isDeductible: true,
  vendorName: "TOC / Gestor",
  isRecurring: true,
  recurrenceRule: "annual",
  recurrenceDay: 1,
  recurrenceEnd: null,
};

/**
 * How to use these templates:
 *
 * 1. Replace REPLACE_WITH_PROPERTY_ID and REPLACE_WITH_USER_ID with real IDs.
 * 2. Adjust amounts to match your actual costs.
 * 3. POST each template to /api/expenses — the recurring fields (isRecurring,
 *    recurrenceRule, recurrenceDay, recurrenceEnd) will be persisted.
 * 4. Call POST /api/expenses/recurring each month to generate the child expenses.
 *
 * Example:
 *   const res = await fetch("/api/expenses", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(imiTemplate),
 *   });
 */
