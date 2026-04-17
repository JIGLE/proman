import { NextRequest } from "next/server";
import { getAccessContext, handleOptions } from "@/lib/services/auth/auth-middleware";
import { createErrorResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { documentService } from "@/lib/services/document-service";

// GET /api/documents/[id]/download - Download document file
async function handleGet(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<Response> {
  const authResult = await getAccessContext(request);
  if (authResult instanceof Response) return authResult;

  const { scopeUserId, portalRole, tenantId, propertyId } = authResult;

  // Handle both sync and async params
  const params = context?.params
    ? context.params instanceof Promise
      ? await context.params
      : context.params
    : {};
  const id = params.id || request.url.split("/documents/")[1]?.split("/")[0] || "";

  if (!id) {
    return createErrorResponse(new Error("Document ID is required"), 400, request);
  }

  try {
    const document = await documentService.getById(scopeUserId, id);
    if (
      portalRole === "tenant" &&
      (!document ||
        (document.tenantId !== tenantId && (!propertyId || document.propertyId !== propertyId)))
    ) {
      return createErrorResponse(new Error("Document not found or file unavailable"), 404, request);
    }

    const file = await documentService.getFileContent(scopeUserId, id);

    if (!file) {
      return createErrorResponse(new Error("Document not found or file unavailable"), 404, request);
    }

    // Convert Buffer to Uint8Array for Response compatibility
    const uint8Array = new Uint8Array(file.content);

    // Return file as download
    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        "Content-Length": file.content.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// Export handlers
export const GET = withErrorHandler(handleGet);
export const OPTIONS = handleOptions;
