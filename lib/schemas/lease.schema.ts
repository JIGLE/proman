import { z } from "zod";

export const leaseSchema = z
  .object({
    tenantId: z.string().min(1, "Tenant is required"),
    propertyId: z.string().min(1, "Property is required"),
    unitId: z.string().optional(),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
    monthlyRent: z.number().positive("Rent must be positive"),
    deposit: z.number().min(0, "Deposit cannot be negative").default(0),
    taxRegime: z.enum(["portugal_rendamentos", "spain_inmuebles"]).optional(),
    status: z.enum(["active", "expired", "terminated", "pending", "draft"]).default("draft"),
    autoRenew: z.boolean().default(false),
    renewalNoticeDays: z.number().min(0).max(365).default(60),
    notes: z.string().max(1000, "Notes too long").optional(),
  })
  .refine((data) => Date.parse(data.endDate) > Date.parse(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const createLeaseSchema = leaseSchema.omit({ status: true });
export const updateLeaseSchema = leaseSchema.partial();

export type Lease = z.infer<typeof leaseSchema>;
export type LeaseFormData = z.infer<typeof leaseSchema>;
export type CreateLease = z.infer<typeof createLeaseSchema>;
export type UpdateLease = z.infer<typeof updateLeaseSchema>;
