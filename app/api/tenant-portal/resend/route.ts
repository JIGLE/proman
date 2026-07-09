/**
 * Tenant Portal Access Recovery API
 * POST /api/tenant-portal/resend - Email a fresh portal link to a tenant
 *
 * Unauthenticated by design (a tenant who lost their link has no other way
 * in). Always returns a generic success message regardless of whether the
 * email matched a tenant, so the endpoint can't be used to enumerate tenant
 * accounts.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createSuccessResponse, createErrorResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getPrismaClient } from "@/lib/services/database/database";
import { tenantPortalService } from "@/lib/services/auth/tenant-portal-auth";

const ResendSchema = z.object({
  email: z.string().email(),
});

async function handlePOST(request: NextRequest): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const validatedData = ResendSchema.safeParse(body);

  if (!validatedData.success) {
    return createErrorResponse(
      new Error(validatedData.error.issues[0]?.message || "A valid email is required"),
      400,
      request,
    );
  }

  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findUnique({
    where: { email: validatedData.data.email.toLowerCase() },
    select: { id: true, userId: true },
  });

  if (tenant) {
    await tenantPortalService.sendInvitation(tenant.id, tenant.userId);
  }

  return createSuccessResponse({ sent: true });
}

export const POST = withErrorHandler(withRateLimit(handlePOST));
