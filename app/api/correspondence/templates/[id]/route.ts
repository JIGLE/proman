import { NextRequest } from 'next/server';
import { handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { templateService } from '@/lib/services/database';
import { sanitizeForDatabase } from '@/lib/utils/sanitize';
import { z } from 'zod';

// Validation schema for updates
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['welcome', 'rent_reminder', 'eviction_notice', 'maintenance_request', 'lease_renewal', 'custom']).optional(),
  subject: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(10000).optional(),
  variables: z.array(z.string()).optional(),
});

// GET /api/correspondence/templates/[id] - Get a specific template
async function handleGet(request: NextRequest, context?: { params?: Record<string, string> | Promise<Record<string, string>> }): Promise<Response> {
  let id: string | undefined;
  if (context?.params) {
    const maybe = context.params as Record<string, string> | Promise<Record<string, string>>;
    const resolved = (maybe instanceof Promise) ? await maybe : maybe;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);
  try {
    const template = await templateService.getById(id);

    if (!template) {
      return createErrorResponse(new Error('Template not found'), 404, request);
    }

    return createSuccessResponse(template);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// PUT /api/correspondence/templates/[id] - Update a specific template
async function handlePut(request: NextRequest, context?: { params?: Record<string, string> | Promise<Record<string, string>> }): Promise<Response> {
  let id: string | undefined;
  if (context?.params) {
    const maybe = context.params as Record<string, string> | Promise<Record<string, string>>;
    const resolved = (maybe instanceof Promise) ? await maybe : maybe;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    // First check if template exists
    const existingTemplate = await templateService.getById(id);
    if (!existingTemplate) {
      return createErrorResponse(new Error('Template not found'), 404, request);
    }

    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      name: body.name ? sanitizeForDatabase(body.name) : undefined,
      subject: body.subject ? sanitizeForDatabase(body.subject) : undefined,
      content: body.content ? sanitizeForDatabase(body.content) : undefined,
    };

    // Validate input
    const validatedData = updateTemplateSchema.parse(sanitizedBody);

    const template = await templateService.update(id, validatedData);
    return createSuccessResponse(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        new Error(`Validation error: ${error.issues.map(e => e.message).join(', ')}`),
        400,
        request
      );
    }
    return createErrorResponse(error as Error, 500, request);
  }
}

// DELETE /api/correspondence/templates/[id] - Delete a specific template
async function handleDelete(request: NextRequest, context?: { params?: Record<string, string> | Promise<Record<string, string>> }): Promise<Response> {
  let id: string | undefined;
  if (context?.params) {
    const maybe = context.params as Record<string, string> | Promise<Record<string, string>>;
    const resolved = (maybe instanceof Promise) ? await maybe : maybe;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    // First check if template exists
    const existingTemplate = await templateService.getById(id);
    if (!existingTemplate) {
      return createErrorResponse(new Error('Template not found'), 404, request);
    }

    await templateService.delete(id);
    return createSuccessResponse({ message: 'Template deleted successfully' });
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// Main handler
export const GET = withErrorHandler(handleGet);
export const PUT = withErrorHandler(handlePut);
export const DELETE = withErrorHandler(handleDelete);
export const OPTIONS = handleOptions;