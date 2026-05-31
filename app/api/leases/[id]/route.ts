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

  const json = await request.json();

  let updateData: Record<string, unknown> = { ...json };

  if (json.startDate) updateData.startDate = new Date(json.startDate);
  if (json.endDate) updateData.endDate = new Date(json.endDate);

  if (json.contractFile) {
    const contractBuffer = Buffer.from(json.contractFile, "base64");
    updateData.contractFile = contractBuffer;
    updateData.contractFileSize = contractBuffer.length;
    updateData.contractFileName = `lease-contract-${Date.now()}.pdf`;
  }

  const lease = await prisma.lease.update({
    where: { id, userId },
    data: updateData,
    include: leaseInclude,
  });

  return createSuccessResponse(lease);
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

  await prisma.lease.delete({ where: { id, userId } });

  return createSuccessResponse({ message: "Lease deleted successfully" });
}

export const PUT = withErrorHandler(handlePut);
export const DELETE = withErrorHandler(handleDelete);
export const OPTIONS = handleOptions;
