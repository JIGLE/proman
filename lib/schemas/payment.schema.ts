import { z } from 'zod';

/**
 * Shared Payment Schema
 * 
 * Used across the application for:
 * - Frontend validation (payment forms)
 * - Backend API validation
 * - Database operations
 */

export const paymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  invoiceId: z.string().optional(),
  amount: z.number().positive('Payment amount must be positive'),
  paymentDate: z.coerce.date(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit_card', 'check', 'digital_wallet', 'other']),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
  transactionId: z.string().optional(),
  reference: z.string().max(100, 'Reference too long').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  fees: z.number().min(0, 'Fees cannot be negative').default(0),
  currency: z.enum(['EUR', 'USD']).default('EUR'),
});

export const createPaymentSchema = paymentSchema.omit({ status: true });
export const updatePaymentSchema = paymentSchema.partial();

export type Payment = z.infer<typeof paymentSchema>;
export type CreatePayment = z.infer<typeof createPaymentSchema>;
export type UpdatePayment = z.infer<typeof updatePaymentSchema>;
