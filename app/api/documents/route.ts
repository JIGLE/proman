import { NextRequest } from "next/server";
import {
  getAccessContext,
  handleOptions,
  requireOwnerAccess,
} from "@/lib/services/auth/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import {
  documentService,
  type DocumentFilter,
  type DocumentType,
} from "@/lib/services/document-service";
import { sanitizeForDatabase } from "@/lib/utils/sanitize";
import { z } from "zod";
import { handleDemoGet, handleDemoMutation } from "@/lib/demo/demo-api-handler";

// Validation schemas
const documentTypeSchema = z.enum([
  "contract",
  "invoice",
  "receipt",
  "photo",
  "floor_plan",
  "certificate",
  "other",
]);

const createDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: documentTypeSchema,
  mimeType: z.string(),
  fileContent: z.string(), // Base64 encoded content
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  ownerId: z.string().optional(),
  tenantId: z.string().optional(),
});

// GET /api/documents - Get all documents with optional filters
async function handleGet(request: NextRequest): Promise<Response> {
  const demo = handleDemoGet(request, "documents");
  if (demo.response) return demo.response;

  const authResult = await getAccessContext(request);
  if (authResult instanceof Response) return authResult;

  const {
    scopeUserId,
    portalRole,
    tenantId: accessTenantId,
    propertyId: accessPropertyId,
  } = authResult;
  const { searchParams } = new URL(request.url);

  try {
    const filters: DocumentFilter = {};

    const type = searchParams.get("type");
    if (type && documentTypeSchema.safeParse(type).success) {
      filters.type = type as DocumentType;
    }

    const propertyId = searchParams.get("propertyId");
    if (propertyId) filters.propertyId = sanitizeForDatabase(propertyId);

    const unitId = searchParams.get("unitId");
    if (unitId) filters.unitId = sanitizeForDatabase(unitId);

    const ownerId = searchParams.get("ownerId");
    if (ownerId) filters.ownerId = sanitizeForDatabase(ownerId);

    const tenantId = searchParams.get("tenantId");
    if (tenantId) filters.tenantId = sanitizeForDatabase(tenantId);

    const search = searchParams.get("search");
    if (search) filters.search = sanitizeForDatabase(search);

    const documents = await documentService.getAll(scopeUserId, filters);
    const scopedDocuments =
      portalRole === "tenant" && accessTenantId
        ? documents.filter(
            (document) =>
              document.tenantId === accessTenantId ||
              (accessPropertyId ? document.propertyId === accessPropertyId : false),
          )
        : documents;
    return createSuccessResponse(scopedDocuments);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// POST /api/documents - Upload a new document
async function handlePost(request: NextRequest): Promise<Response> {
  const demo = await handleDemoMutation(request, "documents");
  if (demo.response) return demo.response;

  const authResult = await requireOwnerAccess(request);
  if (authResult instanceof Response) return authResult;

  const { scopeUserId } = authResult;

  try {
    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      name: sanitizeForDatabase(body.name),
      description: body.description ? sanitizeForDatabase(body.description) : undefined,
      propertyId: body.propertyId ? sanitizeForDatabase(body.propertyId) : undefined,
      unitId: body.unitId ? sanitizeForDatabase(body.unitId) : undefined,
      ownerId: body.ownerId ? sanitizeForDatabase(body.ownerId) : undefined,
      tenantId: body.tenantId ? sanitizeForDatabase(body.tenantId) : undefined,
    };

    // Validate input
    const validatedData = createDocumentSchema.parse(sanitizedBody);

    const document = await documentService.create(scopeUserId, validatedData);
    return createSuccessResponse(document, 201);
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

// Export handlers
export const GET = withErrorHandler(handleGet);
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
