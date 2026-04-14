import { NextRequest } from "next/server";
import { handleOptions, requireAuth } from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { templateService } from "@/lib/services/database";
import { sanitizeForDatabase } from "@/lib/utils/sanitize";
import { z } from "zod";
import { handleDemoGet, handleDemoMutation } from "@/lib/demo/demo-api-handler";

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum([
    "welcome",
    "rent_reminder",
    "eviction_notice",
    "maintenance_request",
    "lease_renewal",
    "custom",
  ]),
  subject: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
  variables: z.array(z.string()).default([]),
});

const _updateTemplateSchema = createTemplateSchema.partial();

// GET /api/correspondence/templates - Get all correspondence templates
async function handleGet(request: NextRequest): Promise<Response> {
  const demo = handleDemoGet(request, "templates");
  if (demo.response) return demo.response;

  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const templates = await templateService.getAll();
    return createSuccessResponse(templates);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// POST /api/correspondence/templates - Create a new correspondence template
async function handlePost(request: NextRequest): Promise<Response> {
  const demo = handleDemoMutation(request, "templates");
  if (demo.response) return demo.response;

  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  try {
    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      name: sanitizeForDatabase(body.name),
      subject: sanitizeForDatabase(body.subject),
      content: sanitizeForDatabase(body.content),
    };

    // Validate input
    const validatedData = createTemplateSchema.parse(sanitizedBody);

    const template = await templateService.create(validatedData);
    return createSuccessResponse(template, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        new Error(`Validation error: ${error.issues.map((e) => e.message).join(", ")}`),
        400,
        request,
      );
    }
    return createErrorResponse(error as Error, 500, request);
  }
}

// Main handler
export const GET = withErrorHandler(handleGet);
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
