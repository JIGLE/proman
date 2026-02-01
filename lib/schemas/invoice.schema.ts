import { z } from 'zod';

/**
 * Shared Invoice Schema
 * 
 * Used across the application for:
 * - Frontend validation (invoice forms)
 * - Backend API validation
 * - Database operations
 */

export const invoiceSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.coerce.date(),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  type: z.enum(['rent', 'utilities', 'maintenance', 'other']).default('rent'),
  recurring: z.boolean().default(false),
  recurringInterval: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  lateFee: z.number().min(0, 'Late fee cannot be negative').default(0),
  taxRate: z.number().min(0).max(1, 'Tax rate must be between 0 and 100%').default(0),
}).refine((data) => {
  if (data.recurring && !data.recurringInterval) {
    return false;
  }
  return true;
}, {
  message: 'Recurring interval is required for recurring invoices',
  path: ['recurringInterval'],
});

export const createInvoiceSchema = invoiceSchema.omit({ status: true });
export const updateInvoiceSchema = invoiceSchema.partial();

export type Invoice = z.infer<typeof invoiceSchema>;
export type CreateInvoice = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;
