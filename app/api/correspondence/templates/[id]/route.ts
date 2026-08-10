import { NextRequest } from "next/server";
import { handleOptions, requireAuth } from "@/lib/services/auth/auth-middleware";
import {
  ResourceNotFoundError,
  createErrorResponse,
  createSuccessResponse,
  parseBody,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { templateService } from "@/lib/services/database/correspondence";
import { sanitizeForDatabase } from "@/lib/utils/sanitize";
import { z } from "zod";

/**
 * Templates are visible to their owner and to everyone when system-owned, but only the owner may
 * change one. Before this was scoped, the route fetched by id alone and any signed-in landlord
 * could read, edit or delete a template every other landlord was using.
 *
 * A system template refuses edits with 403 and advice to copy it first — that copy is where
 * responsibility for the wording transfers to the user.
 */

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z
    .enum([
      "welcome",
      "rent_reminder",
      "eviction_notice",
      "maintenance_request",
      "lease_renewal",
      "custom",
    ])
    .optional(),
  subject: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(10000).optional(),
  variables: z.array(z.string()).optional(),
  country: z.string().length(2).optional(),
  locale: z.string().max(10).optional(),
});

async function resolveId(context?: {
  params?: Record<string, string> | Promise<Record<string, string>>;
}): Promise<string | undefined> {
  if (!context?.params) return undefined;
  const resolved = context.params instanceof Promise ? await context.params : context.params;
  return resolved?.id;
}

// GET /api/correspondence/templates/[id]
async function handleGet(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const id = await resolveId(context);
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  const template = await templateService.getById(authResult.userId, id);
  if (!template) {
    return createErrorResponse(new ResourceNotFoundError("Template"), 404, request);
  }

  return createSuccessResponse(template);
}

// PUT /api/correspondence/templates/[id]
async function handlePut(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const id = await resolveId(context);
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  const body = await request.json();
  const sanitizedBody = {
    ...body,
    ...(body.name !== undefined && { name: sanitizeForDatabase(body.name) }),
    ...(body.subject !== undefined && { subject: sanitizeForDatabase(body.subject) }),
    ...(body.content !== undefined && { content: sanitizeForDatabase(body.content) }),
  };
  const validatedData = parseBody(sanitizedBody, updateTemplateSchema);

  // Ownership is enforced in the service, which throws ForbiddenError for a system template and
  // ResourceNotFoundError for anything the caller cannot see. withErrorHandler maps both.
  const template = await templateService.update(authResult.userId, id, validatedData);
  return createSuccessResponse(template);
}

// DELETE /api/correspondence/templates/[id]
async function handleDelete(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const id = await resolveId(context);
  if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

  await templateService.delete(authResult.userId, id);
  return createSuccessResponse({ message: "Template deleted successfully" });
}

export const GET = withErrorHandler(handleGet);
export const PUT = withErrorHandler(handlePut);
export const DELETE = withErrorHandler(handleDelete);
export const OPTIONS = handleOptions;
