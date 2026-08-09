import { z } from "zod";

/**
 * Ownership links between a Property and an Owner (the `PropertyOwner` join model).
 *
 * `ownershipPercentage` is a share of the property, so it is bounded at both ends: 0 would be a
 * link that conveys nothing, and no single owner can exceed 100%. The *sum* across a property is
 * checked in the route, since it needs the other rows to do the arithmetic.
 */
export const propertyOwnerSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  ownerId: z.string().min(1, "Owner is required"),
  ownershipPercentage: z
    .number({ message: "Ownership percentage must be a number" })
    .gt(0, "Ownership percentage must be greater than 0")
    .lte(100, "Ownership percentage cannot exceed 100"),
  role: z.enum(["MANAGING", "REGULAR"]).optional(),
});

/** DELETE identifies the row by its natural key, both arriving as query parameters. */
export const propertyOwnerDeleteSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  ownerId: z.string().min(1, "Owner is required"),
});

export type PropertyOwnerInput = z.infer<typeof propertyOwnerSchema>;
export type PropertyOwnerDeleteInput = z.infer<typeof propertyOwnerDeleteSchema>;
