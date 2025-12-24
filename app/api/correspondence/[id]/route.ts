import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { correspondenceService } from '@/lib/database';

// GET /api/correspondence/[id] - Get a specific correspondence
async function handleGet(request: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const correspondence = await correspondenceService.getById(userId, params.id);

    if (!correspondence) {
      return createErrorResponse(new Error('Correspondence not found'), 404, request);
    }

    return createSuccessResponse(correspondence);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// DELETE /api/correspondence/[id] - Delete a specific correspondence
async function handleDelete(request: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    // First check if correspondence exists and user owns it
    const existingCorrespondence = await correspondenceService.getById(userId, params.id);
    if (!existingCorrespondence) {
      return createErrorResponse(new Error('Correspondence not found'), 404, request);
    }

    await correspondenceService.delete(userId, params.id);
    return createSuccessResponse({ message: 'Correspondence deleted successfully' });
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// Main handler
export const GET = withErrorHandler(handleGet);
export const DELETE = withErrorHandler(handleDelete);
export const OPTIONS = handleOptions;