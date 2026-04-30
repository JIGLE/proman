import { z } from "zod";

export const ownershipVerificationProviderSchema = z.enum([
  "financas",
  "cadastro",
  "land_registry",
  "manual_review",
]);

export const ownershipVerificationScopeSchema = z.enum([
  "identity",
  "property_ownership",
  "property_details",
]);

export const propertyVerificationClaimTypeSchema = z.enum([
  "ownership",
  "management",
  "details_access",
]);

export const createOwnershipVerificationSchema = z.object({
  provider: ownershipVerificationProviderSchema,
  scope: ownershipVerificationScopeSchema,
  externalReference: z.string().trim().min(1).max(200).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  propertyClaims: z
    .array(
      z.object({
        propertyId: z.string().trim().min(1, "Property ID is required"),
        claimType: propertyVerificationClaimTypeSchema.default("ownership"),
        ownershipPercentage: z.number().min(0).max(100).optional(),
        sourceReference: z.string().trim().min(1).max(200).optional(),
        matchedAddress: z.string().trim().min(1).max(500).optional(),
      }),
    )
    .max(25)
    .optional(),
});

export const ownershipVerificationFiltersSchema = z.object({
  provider: ownershipVerificationProviderSchema.optional(),
  scope: ownershipVerificationScopeSchema.optional(),
  status: z.enum(["pending", "authorized", "verified", "rejected", "expired", "failed"]).optional(),
  propertyId: z.string().trim().min(1).optional(),
});

export type CreateOwnershipVerificationInput = z.infer<typeof createOwnershipVerificationSchema>;
export type OwnershipVerificationFilters = z.infer<typeof ownershipVerificationFiltersSchema>;
