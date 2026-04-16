import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { getPrismaClient } from "@/lib/services/database/database";
import { maintenanceSchema } from "@/lib/utils/validation";

const ticketInclude = {
  property: { select: { name: true } },
  tenant: { select: { name: true } },
};

function flattenTicket(
  ticket: Record<string, unknown> & {
    property: { name: string };
    tenant?: { name: string } | null;
  },
) {
  return {
    ...ticket,
    propertyName: ticket.property.name,
    tenantName: ticket.tenant?.name,
  };
}

async function handleGet(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();

  let id: string | undefined;
  if (context?.params) {
    const resolved = context.params instanceof Promise ? await context.params : context.params;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id, userId },
    include: ticketInclude,
  });

  if (!ticket) {
    return createErrorResponse(new Error("Ticket not found"), 404, request);
  }

  return createSuccessResponse(flattenTicket(ticket));
}

async function handlePut(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();

  let id: string | undefined;
  if (context?.params) {
    const resolved = context.params instanceof Promise ? await context.params : context.params;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  const existingTicket = await prisma.maintenanceTicket.findFirst({
    where: { id, userId },
  });

  if (!existingTicket) {
    return createErrorResponse(new Error("Ticket not found"), 404, request);
  }

  const json = await request.json();
  const partialSchema = maintenanceSchema.partial();
  const body = partialSchema.parse(json);

  const updateData: Record<string, unknown> = { ...body };
  if (body.status === "resolved" && existingTicket.status !== "resolved") {
    updateData.resolvedAt = new Date();
  } else if (body.status && body.status !== "resolved") {
    updateData.resolvedAt = null;
  }

  const ticket = await prisma.maintenanceTicket.update({
    where: { id },
    data: updateData,
    include: ticketInclude,
  });

  return createSuccessResponse(flattenTicket(ticket));
}

async function handleDelete(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();

  let id: string | undefined;
  if (context?.params) {
    const resolved = context.params instanceof Promise ? await context.params : context.params;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  const existingTicket = await prisma.maintenanceTicket.findFirst({
    where: { id, userId },
  });

  if (!existingTicket) {
    return createErrorResponse(new Error("Ticket not found"), 404, request);
  }

  await prisma.maintenanceTicket.delete({ where: { id } });

  return createSuccessResponse({ message: "Ticket deleted successfully" });
}

export const GET = withErrorHandler(handleGet);
export const PUT = withErrorHandler(handlePut);
export const DELETE = withErrorHandler(handleDelete);
