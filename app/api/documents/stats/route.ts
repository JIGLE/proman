import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { documentService } from '@/lib/document-service';

// GET /api/documents/stats - Get document statistics
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const stats = await documentService.getStats(userId);
    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// Export handlers
export const GET = withErrorHandler(handleGet);
export const OPTIONS = handleOptions;
