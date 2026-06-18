import { NextRequest } from "next/server";
import { requireAuth, handleOptions } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { getPrismaClient } from "@/lib/services/database/database";

const leaseInclude = {
  property: { select: { name: true, address: true } },
  tenant: { select: { name: true, email: true } },
};

async function resolveId(
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<string | undefined> {
  if (!context?.params) return undefined;
  const resolved =
    context.params instanceof Promise ? await context.params : context.params;
  return resolved?.id;
}

/**
 * POST /api/leases/[id]/renewal
 * Send a renewal offer to the tenant.
 */
async function handlePost(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();

  const id = await resolveId(context);
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  // Verify ownership
  const existing = await prisma.lease.findFirst({ where: { id, userId } });
  if (!existing) return createErrorResponse(new Error("Lease not found"), 404, request);

  const json = await request.json().catch(() => ({})) as Record<string, unknown>;

  // Default to same terms as current lease
  const proposedRent =
    typeof json.proposedRent === "number" ? json.proposedRent : existing.monthlyRent;
  const newStart = json.proposedStartDate
    ? new Date(json.proposedStartDate as string)
    : new Date(new Date(existing.endDate).getTime() + 24 * 60 * 60 * 1000);
  const newEnd = json.proposedEndDate
    ? new Date(json.proposedEndDate as string)
    : new Date(newStart.getTime() + 365 * 24 * 60 * 60 * 1000);
  const notes = typeof json.notes === "string" ? json.notes : null;

  const lease = await prisma.lease.update({
    where: { id, userId },
    data: {
      renewalStatus: "offered",
      renewalOfferedAt: new Date(),
      renewalRespondedAt: null,
      renewalNotes: notes,
      // Store proposed terms in notes as JSON supplement if provided
      ...(json.proposedRent !== undefined ||
      json.proposedStartDate !== undefined ||
      json.proposedEndDate !== undefined
        ? {
            renewalNotes: JSON.stringify({
              notes,
              proposedRent,
              proposedStartDate: newStart.toISOString(),
              proposedEndDate: newEnd.toISOString(),
            }),
          }
        : {}),
    },
    include: leaseInclude,
  });

  return createSuccessResponse(lease);
}

/**
 * PATCH /api/leases/[id]/renewal
 * Respond to a renewal offer — used by tenant portal.
 * Body: { response: "accepted" | "declined" }
 */
async function handlePatch(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();

  const id = await resolveId(context);
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  const json = await request.json() as Record<string, unknown>;
  const response = json.response;

  if (response !== "accepted" && response !== "declined") {
    return createErrorResponse(
      new Error('Invalid response: must be "accepted" or "declined"'),
      400,
      request,
    );
  }

  const lease = await prisma.lease.update({
    where: { id, userId },
    data: {
      renewalStatus: response,
      renewalRespondedAt: new Date(),
    },
    include: leaseInclude,
  });

  return createSuccessResponse(lease);
}

export const POST = withErrorHandler(handlePost);
export const PATCH = withErrorHandler(handlePatch);
export const OPTIONS = handleOptions;
