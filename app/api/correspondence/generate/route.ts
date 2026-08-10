import { NextRequest } from "next/server";
import { requireAuth, handleOptions } from "@/lib/services/auth/auth-middleware";
import {
  ResourceNotFoundError,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { templateService, correspondenceService } from "@/lib/services/database/correspondence";
import { getPrismaClient } from "@/lib/services/database/database";
import { sanitizeForDatabase } from "@/lib/utils/sanitize";
import { z } from "zod";

// Validation schema
const generateCorrespondenceSchema = z.object({
  templateId: z.string().min(1),
  tenantId: z.string().min(1),
  /**
   * Extra values for keys the server cannot know (a custom reference, a free-text reason). These
   * are merged UNDER the server-derived map — a caller cannot override a fact about the tenancy.
   */
  variables: z.record(z.string(), z.string()).optional(),
});

const EUR = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

/**
 * Build the substitution map from records the server has already scoped to the caller.
 *
 * Previously every value came from the request body, so the arrears figure in a payment demand was
 * whatever the client posted rather than what the ledger said. For anything with legal weight the
 * number *is* the operative content, so it has to be derived here.
 */
async function deriveVariables(userId: string, tenantId: string): Promise<Record<string, string>> {
  const tenant = await getPrismaClient().tenant.findFirst({
    where: { id: tenantId, userId },
    include: {
      property: true,
      leases: { where: { status: "active" }, orderBy: { startDate: "desc" }, take: 1 },
    },
  });
  if (!tenant) return {};

  const lease = tenant.leases?.[0];
  const property = tenant.property;
  const monthlyRent = lease?.monthlyRent ?? tenant.rent ?? 0;

  const iso = (d: Date | null | undefined) => (d ? d.toISOString().split("T")[0] : "");

  return {
    "{{tenant_name}}": tenant.name ?? "",
    "{{tenant_email}}": tenant.email ?? "",
    "{{property_name}}": property?.name ?? "",
    "{{property_address}}": property?.address ?? "",
    "{{property_city}}": property?.city ?? "",
    "{{bedrooms}}": property?.bedrooms != null ? String(property.bedrooms) : "",
    "{{bathrooms}}": property?.bathrooms != null ? String(property.bathrooms) : "",
    "{{rent_amount}}": EUR.format(monthlyRent),
    "{{deposit_amount}}": lease?.deposit != null ? EUR.format(lease.deposit) : "",
    "{{lease_start}}": iso(lease?.startDate ?? tenant.leaseStart),
    "{{lease_end}}": iso(lease?.endDate ?? tenant.leaseEnd),
  };
}

// Template variable substitution function
function substituteVariables(template: string, variables: Record<string, string> = {}): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    result = result.split(key).join(value);
  });

  return result;
}

// POST /api/correspondence/generate - Generate correspondence from template
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      templateId: sanitizeForDatabase(body.templateId),
      tenantId: sanitizeForDatabase(body.tenantId),
      variables: body.variables || {},
    };

    // Validate input
    const validatedData = generateCorrespondenceSchema.parse(sanitizedBody);

    // Scoped to the caller: their own templates plus system ones, never another landlord's.
    const template = await templateService.getById(userId, validatedData.templateId);
    if (!template) {
      return createErrorResponse(new ResourceNotFoundError("Template"), 404, request);
    }

    // Caller-supplied values first, server-derived facts last — the spread order is the whole
    // guarantee. A caller cannot pass {{rent_amount}} and have it win over the tenancy record.
    const substitutions: Record<string, string> = {
      "{{current_date}}": new Date().toISOString().split("T")[0],
      "{{current_year}}": new Date().getFullYear().toString(),
      ...(validatedData.variables ?? {}),
      ...(await deriveVariables(userId, validatedData.tenantId)),
    };

    const processedSubject = substituteVariables(template.subject, substitutions);
    const processedContent = substituteVariables(template.content, substitutions);

    // Create correspondence record, snapshotting where the wording came from. templateId is a
    // convenience link that may go NULL later; these three fields stand on their own.
    const correspondence = await correspondenceService.create(userId, {
      tenantId: validatedData.tenantId,
      templateId: validatedData.templateId,
      subject: processedSubject,
      content: processedContent,
      status: "draft", // Start as draft, can be sent later
      templateNameSnapshot: template.name,
      templateVersionSnapshot: template.version ?? 1,
      templateOriginSnapshot: template.isSystem ? "system" : "user",
    });

    return createSuccessResponse(
      {
        ...correspondence,
        originalTemplate: {
          id: template.id,
          name: template.name,
          type: template.type,
        },
      },
      201,
    );
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
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
