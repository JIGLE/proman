import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { correspondenceService } from '@/lib/services/database/database';

// GET /api/correspondence/[id] - Get a specific correspondence
async function handleGet(request: NextRequest, context?: { params?: Record<string, string> | Promise<Record<string, string>> }): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  // context.params may be a Promise<Record<string,string>> or a plain Record
  let id: string | undefined;
  if (context?.params) {
    const maybe = context.params as Record<string, string> | Promise<Record<string, string>>;
    const resolved = (maybe instanceof Promise) ? await maybe : maybe;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    const correspondence = await correspondenceService.getById(userId, id);

    if (!correspondence) {
      return createErrorResponse(new Error('Correspondence not found'), 404, request);
    }

    return createSuccessResponse(correspondence);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// DELETE /api/correspondence/[id] - Delete a specific correspondence
async function handleDelete(request: NextRequest, context?: { params?: Record<string, string> | Promise<Record<string, string>> }): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  // context.params may be a Promise<Record<string,string>> or a plain Record
  let id: string | undefined;
  if (context?.params) {
    const maybe = context.params as Record<string, string> | Promise<Record<string, string>>;
    const resolved = (maybe instanceof Promise) ? await maybe : maybe;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    // First check if correspondence exists and user owns it
    const existingCorrespondence = await correspondenceService.getById(userId, id);
    if (!existingCorrespondence) {
      return createErrorResponse(new Error('Correspondence not found'), 404, request);
    }

    await correspondenceService.delete(userId, id);
    return createSuccessResponse({ message: 'Correspondence deleted successfully' });
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// Main handler
export const GET = withErrorHandler(handleGet);
export const DELETE = withErrorHandler(handleDelete);
export const OPTIONS = handleOptions;