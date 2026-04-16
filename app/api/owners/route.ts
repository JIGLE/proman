import { NextRequest } from "next/server";
import { requireAuth, handleOptions } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { ownerSchema } from "@/lib/utils/validation";
import { isMockMode } from "@/lib/config/data-mode";
import { handleDemoGet, handleDemoMutation } from "@/lib/demo/demo-api-handler";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";

async function handleGet(request: NextRequest): Promise<Response> {
  const demo = handleDemoGet(request, "owners");
  if (demo.response) return demo.response;

  if (isMockMode) {
    return createSuccessResponse([]);
  }
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();

  const owners = await prisma.owner.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      properties: {
        include: {
          property: true,
        },
      },
    },
  });

  return createSuccessResponse(owners);
}

async function handlePost(request: NextRequest): Promise<Response> {
  const demo = await handleDemoMutation(request, "owners");
  if (demo.response) return demo.response;

  if (isMockMode) {
    return createSuccessResponse({ error: "Write operations not supported in mock mode" }, 403);
  }
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const prisma = getPrismaClient();

  const json = await request.json();
  const body = ownerSchema.parse(json);

  const owner = await prisma.owner.create({
    data: {
      ...body,
      userId,
    },
  });

  return createSuccessResponse(owner, 201);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const POST = withErrorHandler(withRateLimit(handlePost));
export const OPTIONS = handleOptions;
