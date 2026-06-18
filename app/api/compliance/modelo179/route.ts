/**
 * API Route: /api/compliance/modelo179
 * GET  — List Modelo 179 submissions for the authenticated user, optionally filtered by ?year=
 * POST — Create or update a Modelo 179 submission record (upsert on leaseId+periodYear)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { logAudit } from "@/lib/services/audit-log";
import { withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";

const modelo179PostSchema = z.object({
  leaseId: z.string().min(1),
  periodYear: z.number().int().min(2000).max(2100),
  status: z.enum(["pending", "submitted", "confirmed", "rejected"]).optional(),
  atReference: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  submittedAt: z.string().datetime().nullable().optional(),
});

async function handleGet(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : undefined;

  // Fetch all active/terminated leases owned by the user
  const leases = await prisma.lease.findMany({
    where: {
      userId,
      status: { in: ["active", "terminated", "expired"] },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      monthlyRent: true,
      status: true,
      property: { select: { id: true, name: true, address: true } },
      tenant: { select: { id: true, name: true, email: true } },
      modelo179Submissions: year
        ? { where: { periodYear: year }, orderBy: { createdAt: "desc" } }
        : { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  await logAudit({
    userId,
    action: "VIEW_MODELO179_SUBMISSIONS",
    resourceType: "Modelo179Submission",
    details: { year, leaseCount: leases.length },
  });

  return NextResponse.json({ data: leases, year: year ?? null });
}

async function handlePost(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const rawBody: unknown = await request.json();
  const parsed = modelo179PostSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { leaseId, periodYear, status, atReference, notes, submittedAt } = parsed.data;
  const prisma = getPrismaClient();

  // Verify the lease belongs to this user
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, userId },
    select: { id: true },
  });

  if (!lease) {
    return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
  }

  const submission = await prisma.modelo179Submission.upsert({
    where: { leaseId_periodYear: { leaseId, periodYear } },
    update: {
      ...(status && { status }),
      ...(atReference !== undefined && { atReference }),
      ...(notes !== undefined && { notes }),
      ...(submittedAt !== undefined && {
        submittedAt: submittedAt ? new Date(submittedAt) : null,
      }),
    },
    create: {
      userId,
      leaseId,
      periodYear,
      status: status ?? "pending",
      atReference: atReference ?? null,
      notes: notes ?? null,
      submittedAt: submittedAt ? new Date(submittedAt) : null,
    },
  });

  await logAudit({
    userId,
    action: "UPSERT_MODELO179_SUBMISSION",
    resourceType: "Modelo179Submission",
    resourceId: submission.id,
    details: { leaseId, periodYear, status },
  });

  return NextResponse.json({ data: submission }, { status: 200 });
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const POST = withErrorHandler(withRateLimit(handlePost));
