import { NextRequest } from "next/server";
import {
  getAccessContext,
  handleOptions,
  requireOwnerAccess,
} from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { getPrismaClient } from "@/lib/services/database/database";
import { leaseSchema } from "@/lib/schemas/lease.schema";
import { isMockMode } from "@/lib/config/data-mode";
import { handleDemoGet, handleDemoMutation } from "@/lib/demo/demo-api-handler";
import { ZodError } from "zod";

const leaseInclude = {
  property: { select: { name: true, address: true } },
  tenant: { select: { name: true, email: true } },
};

async function handleGet(request: NextRequest): Promise<Response> {
  const demo = handleDemoGet(request, "leases");
  if (demo.response) return demo.response;

  if (isMockMode) {
    return createSuccessResponse([]);
  }

  const authResult = await getAccessContext(request);
  if (authResult instanceof Response) return authResult;

  const { scopeUserId, portalRole, tenantId } = authResult;
  const prisma = getPrismaClient();

  const leases = await prisma.lease.findMany({
    where:
      portalRole === "tenant" && tenantId
        ? { userId: scopeUserId, tenantId }
        : { userId: scopeUserId },
    orderBy: { createdAt: "desc" },
    include: leaseInclude,
  });

  return createSuccessResponse(leases);
}

async function handlePost(request: NextRequest): Promise<Response> {
  const demo = await handleDemoMutation(request, "leases");
  if (demo.response) return demo.response;

  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;

  const { scopeUserId } = authResult;
  const prisma = getPrismaClient();

  try {
    const json = await request.json();
    const body = leaseSchema.parse(json);

    let contractFile: Buffer | undefined;
    let contractFileName: string | undefined;
    let contractFileSize: number | undefined;

    if (json.contractFile) {
      contractFile = Buffer.from(json.contractFile, "base64");
      contractFileSize = contractFile.length;
      contractFileName = `lease-contract-${Date.now()}.pdf`;
    }

    const lease = await prisma.lease.create({
      data: {
        ...body,
        userId: scopeUserId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        contractFile: contractFile ? Buffer.from(contractFile) : undefined,
        contractFileName,
        contractFileSize,
      },
      include: leaseInclude,
    });

    return createSuccessResponse(lease, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(
        new Error(`Validation error: ${error.issues.map((e) => e.message).join(", ")}`),
        400,
        request,
      );
    }
    return createErrorResponse(error as Error, 500, request);
  }
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const POST = withErrorHandler(withRateLimit(handlePost));
export const OPTIONS = handleOptions;
