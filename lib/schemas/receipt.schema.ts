import { z } from "zod";

export const receiptSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  propertyId: z.string().min(1, "Property is required"),
  leaseId: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date"),
  type: z.enum(["rent", "deposit", "maintenance", "other"]),
  status: z.enum(["paid", "pending"]).default("paid"),
  description: z.string().max(500, "Description too long").optional(),
});

export const createReceiptSchema = receiptSchema;
export const updateReceiptSchema = receiptSchema.partial();

export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptFormData = z.infer<typeof receiptSchema>;
export type CreateReceipt = z.infer<typeof createReceiptSchema>;
export type UpdateReceipt = z.infer<typeof updateReceiptSchema>;

// Situs receipt lifecycle (Migration C) — see lib/services/receipts/lifecycle.ts
// for the state machine this validates against.
export const receiptLifecycleTransitionSchema = z.object({
  to: z.enum([
    "draft",
    "review",
    "emitted",
    "submitted",
    "accepted",
    "rejected",
    "exported",
    "voided",
  ]),
  voidReason: z.string().max(500).optional(),
});

export type ReceiptLifecycleTransitionInput = z.infer<typeof receiptLifecycleTransitionSchema>;
