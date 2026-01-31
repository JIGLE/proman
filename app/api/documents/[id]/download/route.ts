import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { createErrorResponse, withErrorHandler } from '@/lib/error-handling';
import { documentService } from '@/lib/document-service';

// GET /api/documents/[id]/download - Download document file
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
  const id = params.id || request.url.split('/documents/')[1]?.split('/')[0] || '';

  if (!id) {
    return createErrorResponse(new Error('Document ID is required'), 400, request);
  }

  try {
    const file = await documentService.getFileContent(userId, id);
    
    if (!file) {
      return createErrorResponse(new Error('Document not found or file unavailable'), 404, request);
    }

    // Convert Buffer to Uint8Array for Response compatibility
    const uint8Array = new Uint8Array(file.content);
    
    // Return file as download
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        'Content-Length': file.content.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// Export handlers
export const GET = withErrorHandler(handleGet);
export const OPTIONS = handleOptions;
