/**
 * Barrel export for all validation schemas
 * 
 * Centralized exports for easy importing:
 * import { propertySchema, tenantSchema } from '@/lib/schemas';
 */

// Property schemas
export {
  propertySchema,
  createPropertySchema,
  updatePropertySchema,
  type Property,
  type CreateProperty,
  type UpdateProperty,
} from './property.schema';

// Tenant schemas
export {
  tenantSchema,
  createTenantSchema,
  updateTenantSchema,
  type Tenant,
  type CreateTenant,
  type UpdateTenant,
} from './tenant.schema';

// Lease schemas
export {
  leaseSchema,
  createLeaseSchema,
  updateLeaseSchema,
  type Lease,
  type CreateLease,
  type UpdateLease,
} from './lease.schema';

// Invoice schemas
export {
  invoiceSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  type Invoice,
  type CreateInvoice,
  type UpdateInvoice,
} from './invoice.schema';

// Payment schemas
export {
  paymentSchema,
  createPaymentSchema,
  updatePaymentSchema,
  type Payment,
  type CreatePayment,
  type UpdatePayment,
} from './payment.schema';

// Receipt schemas
export {
  receiptSchema,
  createReceiptSchema,
  updateReceiptSchema,
  type Receipt,
  type CreateReceipt,
  type UpdateReceipt,
} from './receipt.schema';

// Maintenance schemas
export {
  maintenanceSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
  type Maintenance,
  type CreateMaintenance,
  type UpdateMaintenance,
} from './maintenance.schema';
