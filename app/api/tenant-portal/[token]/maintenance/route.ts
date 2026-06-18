/**
 * Tenant Portal — Maintenance Requests
 * GET  /api/tenant-portal/[token]/maintenance — list all tickets for this tenant
 * POST /api/tenant-portal/[token]/maintenance — create a new tenant-reported ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getPrismaClient } from "@/lib/services/database/database";
import {
  createSuccessResponse,
  createErrorResponse,
  ValidationError,
} from "@/lib/utils/error-handling";
import { verifyPortalToken } from "@/lib/services/auth/tenant-portal-auth";

interface RouteParams {
  params: Promise<{ token: string }>;
}

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  category: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response | NextResponse> {
  const { token } = await params;
  const tokenData = await verifyPortalToken(token);
  if (!tokenData) {
    return createErrorResponse(new Error("Invalid or expired token"), 401, request);
  }

  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tokenData.tenantId },
    select: { id: true },
  });
  if (!tenant) return createErrorResponse(new ValidationError("Tenant not found"), 404, request);

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  return createSuccessResponse(
    tickets.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      isTenantReport: t.isTenantReport,
      createdAt: t.createdAt.toISOString(),
      resolvedAt: t.resolvedAt?.toISOString(),
    })),
  );
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response | NextResponse> {
  const { token } = await params;
  const tokenData = await verifyPortalToken(token);
  if (!tokenData) {
    return createErrorResponse(new Error("Invalid or expired token"), 401, request);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(new ValidationError("Invalid JSON body"), 400, request);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse(new ValidationError(parsed.error.message), 400, request);
  }

  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tokenData.tenantId },
    select: { id: true, propertyId: true },
  });
  if (!tenant || !tenant.propertyId) {
    return createErrorResponse(new ValidationError("Tenant or property not found"), 404, request);
  }

  const ticket = await prisma.maintenanceTicket.create({
    data: {
      userId: tokenData.userId,
      propertyId: tenant.propertyId,
      tenantId: tenant.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      category: parsed.data.category,
      isTenantReport: true,
      images: "[]",
    },
  });

  return createSuccessResponse(
    {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
    },
    201,
  );
}
