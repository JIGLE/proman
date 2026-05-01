import { z } from "zod";

export const leaseTemplateDataSchema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  propertyAddress: z.string().min(1, "Property address is required"),
  unitNumber: z.string().optional(),
  tenantName: z.string().min(1, "Tenant name is required"),
  tenantEmail: z.string().email("Invalid tenant email"),
  tenantPhone: z.string().optional(),
  tenantAddress: z.string().optional(),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email().optional(),
  ownerPhone: z.string().optional(),
  ownerAddress: z.string().optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
  monthlyRent: z.number().min(0, "Monthly rent must be positive"),
  securityDeposit: z.number().min(0, "Security deposit cannot be negative"),
  currency: z.string().default("USD"),
  paymentDueDay: z.number().min(1).max(31).optional(),
  lateFeePercentage: z.number().min(0).max(100).optional(),
  lateFeeGracePeriod: z.number().min(0).max(30).optional(),
  petPolicy: z.string().optional(),
  utilities: z.array(z.string()).optional(),
  parkingSpaces: z.number().min(0).optional(),
  specialTerms: z.array(z.string()).optional(),
  signatureDate: z.string().optional(),
});

export type LeaseTemplateData = z.infer<typeof leaseTemplateDataSchema>;
export type LeaseTemplateDataFormData = z.infer<typeof leaseTemplateDataSchema>;
