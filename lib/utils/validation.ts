/**
 * @deprecated Import directly from `@/lib/schemas` or `@/lib/schemas/<entity>.schema`.
 * This file is kept as a compatibility shim only and will be removed in a future release.
 */

// Re-export property schema (already canonical)
export { propertySchema, type PropertyFormData } from "@/lib/schemas/property.schema";

// Re-export schemas that were previously defined here — now canonical in lib/schemas/
export { tenantSchema, type TenantFormData } from "@/lib/schemas/tenant.schema";

export { receiptSchema, type ReceiptFormData } from "@/lib/schemas/receipt.schema";

export { templateSchema, type TemplateFormData } from "@/lib/schemas/template.schema";

export { settingsSchema, type SettingsFormData } from "@/lib/schemas/settings.schema";

export { ownerSchema, type OwnerFormData } from "@/lib/schemas/owner.schema";

export { expenseSchema, type ExpenseFormData } from "@/lib/schemas/expense.schema";

export { maintenanceSchema, type MaintenanceFormData } from "@/lib/schemas/maintenance.schema";

export { leaseSchema, type LeaseFormData } from "@/lib/schemas/lease.schema";

export { invoiceSchema, type InvoiceFormData } from "@/lib/schemas/invoice.schema";

export {
  lateFeeConfigSchema,
  type LateFeeConfigFormData,
} from "@/lib/schemas/late-fee-config.schema";

export {
  documentSchema,
  documentUpdateSchema,
  type DocumentFormData,
  type DocumentUpdateFormData,
} from "@/lib/schemas/document.schema";

export {
  leaseTemplateDataSchema,
  type LeaseTemplateDataFormData,
} from "@/lib/schemas/lease-template-data.schema";
