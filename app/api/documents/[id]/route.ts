import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { documentService } from '@/lib/services/document-service';
import { sanitizeForDatabase } from '@/lib/utils/sanitize';
import { z } from 'zod';

// Validation schema for updates
const documentTypeSchema = z.enum([
  'contract', 'invoice', 'receipt', 'photo', 'floor_plan', 'certificate', 'other'
]);

const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  type: documentTypeSchema.optional(),
  propertyId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  tenantId: z.string().optional().nullable(),
});

// GET /api/documents/[id] - Get a single document
async function handleGet(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> }
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  
  // Handle both sync and async params
  const params = context?.params ? (
    context.params instanceof Promise ? await context.params : context.params
  ) : {};
  const id = params.id || request.url.split('/').pop()?.split('?')[0] || '';

  if (!id) {
    return createErrorResponse(new Error('Document ID is required'), 400, request);
  }

  try {
    const document = await documentService.getById(userId, id);
    
    if (!document) {
      return createErrorResponse(new Error('Document not found'), 404, request);
    }

    return createSuccessResponse(document);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// PUT /api/documents/[id] - Update document metadata
async function handlePut(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> }
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  
  const params = context?.params ? (
    context.params instanceof Promise ? await context.params : context.params
  ) : {};
  const id = params.id || request.url.split('/').pop()?.split('?')[0] || '';

  if (!id) {
    return createErrorResponse(new Error('Document ID is required'), 400, request);
  }

  try {
    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      name: body.name ? sanitizeForDatabase(body.name) : undefined,
      description: body.description ? sanitizeForDatabase(body.description) : body.description,
      propertyId: body.propertyId ? sanitizeForDatabase(body.propertyId) : body.propertyId,
      unitId: body.unitId ? sanitizeForDatabase(body.unitId) : body.unitId,
      ownerId: body.ownerId ? sanitizeForDatabase(body.ownerId) : body.ownerId,
      tenantId: body.tenantId ? sanitizeForDatabase(body.tenantId) : body.tenantId,
    };

    // Validate input
    const validatedData = updateDocumentSchema.parse(sanitizedBody);

    // Convert null values to undefined for service compatibility
    const updateData = {
      name: validatedData.name,
      description: validatedData.description ?? undefined,
      type: validatedData.type,
      propertyId: validatedData.propertyId ?? undefined,
      unitId: validatedData.unitId ?? undefined,
      ownerId: validatedData.ownerId ?? undefined,
      tenantId: validatedData.tenantId ?? undefined,
    };

    const document = await documentService.update(userId, id, updateData);
    
    if (!document) {
      return createErrorResponse(new Error('Document not found'), 404, request);
    }

    return createSuccessResponse(document);
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

// DELETE /api/documents/[id] - Delete a document
async function handleDelete(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> }
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  
  const params = context?.params ? (
    context.params instanceof Promise ? await context.params : context.params
  ) : {};
  const id = params.id || request.url.split('/').pop()?.split('?')[0] || '';

  if (!id) {
    return createErrorResponse(new Error('Document ID is required'), 400, request);
  }

  try {
    const deleted = await documentService.delete(userId, id);
    
    if (!deleted) {
      return createErrorResponse(new Error('Document not found'), 404, request);
    }

    return createSuccessResponse({ message: 'Document deleted successfully' });
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// Export handlers
export const GET = withErrorHandler(handleGet);
export const PUT = withErrorHandler(handlePut);
export const DELETE = withErrorHandler(handleDelete);
export const OPTIONS = handleOptions;
