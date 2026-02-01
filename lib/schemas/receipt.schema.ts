import { z } from 'zod';

/**
 * Shared Receipt Schema
 * 
 * Used across the application for:
 * - Frontend validation (receipt forms)
 * - Backend API validation
 * - Database operations
 */

export const receiptSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  paymentId: z.string().optional(),
  amount: z.number().positive('Receipt amount must be positive'),
  receiptDate: z.coerce.date(),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  category: z.enum(['rent', 'utilities', 'maintenance', 'deposit', 'other']).default('rent'),
  receiptNumber: z.string().max(50, 'Receipt number too long').optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit_card', 'check', 'digital_wallet', 'other']),
  notes: z.string().max(1000, 'Notes too long').optional(),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').default(0),
  currency: z.enum(['EUR', 'USD']).default('EUR'),
});

export const createReceiptSchema = receiptSchema;
export const updateReceiptSchema = receiptSchema.partial();

export type Receipt = z.infer<typeof receiptSchema>;
export type CreateReceipt = z.infer<typeof createReceiptSchema>;
export type UpdateReceipt = z.infer<typeof updateReceiptSchema>;
