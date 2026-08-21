/**
 * The account list behind the admin area.
 *
 * WHY THIS EXISTS. `registration.ts` closed the door — first user wins, then closed — after the
 * OAuth callback had been admitting any Google account as an ADMIN. Closing it stops new
 * strangers; it does nothing about the ones already inside, and until this module there was no way
 * to see them. The deployment note on that fix had to tell the operator to open Prisma Studio
 * against their production database, which is the clearest possible sign the page was missing.
 *
 * So the job here is narrow: show every account, and let one be revoked safely.
 *
 * DELETION IS THE DANGEROUS HALF, and the guards are the point. A `User` cascades to properties,
 * tenants, leases, receipts and allocations — the entire portfolio. Two of the three refusals below
 * exist because the obvious implementation locks the operator out of their own instance, and the
 * third exists because "are you sure?" is not informed consent when the answer destroys a ledger.
 */

import { getPrismaClient } from "@/lib/services/database/database";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  /** The caller's own row. The UI disables its delete control rather than hiding the row. */
  isSelf: boolean;
  /** What deleting this account would destroy. Counted, never estimated. */
  owns: { properties: number; tenants: number; leases: number; receipts: number };
}

export type DeleteRefusal = "self" | "last_admin";

/**
 * Whether `targetId` may be deleted by `callerId`.
 *
 * Pure, and takes the counts rather than reading them, so every case is enumerable without a
 * database. `null` means allowed.
 */
export function refuseDeletion(input: {
  callerId: string;
  targetId: string;
  targetIsAdmin: boolean;
  totalAdmins: number;
}): DeleteRefusal | null {
  // Deleting yourself ends your own session and, on a single-operator instance, the instance.
  if (input.callerId === input.targetId) return "self";

  // The same outcome by a longer route: remove the only other admin and nobody can administer it.
  // Checked independently of `self` because both can be true and the remedies differ.
  if (input.targetIsAdmin && input.totalAdmins <= 1) return "last_admin";

  return null;
}

/** Every account on the instance, with what each one owns. */
export async function listUsers(callerId: string): Promise<AdminUserRow[]> {
  const prisma = getPrismaClient();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: { select: { properties: true, tenants: true, leases: true, receipts: true } },
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    isSelf: user.id === callerId,
    owns: {
      properties: user._count.properties,
      tenants: user._count.tenants,
      leases: user._count.leases,
      receipts: user._count.receipts,
    },
  }));
}

/**
 * Delete one account, or refuse.
 *
 * Reads the counts the guard needs and applies `refuseDeletion` before touching anything. Returns
 * the refusal rather than throwing, because a refusal is an expected outcome with a 400 and a
 * specific message, not an error.
 */
export async function deleteUser(
  callerId: string,
  targetId: string,
): Promise<{ deleted: true } | { deleted: false; refusal: DeleteRefusal | "not_found" }> {
  const prisma = getPrismaClient();

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!target) return { deleted: false, refusal: "not_found" };

  const totalAdmins = await prisma.user.count({ where: { role: "ADMIN" } });

  const refusal = refuseDeletion({
    callerId,
    targetId,
    targetIsAdmin: target.role === "ADMIN",
    totalAdmins,
  });
  if (refusal) return { deleted: false, refusal };

  await prisma.user.delete({ where: { id: targetId } });
  return { deleted: true };
}
