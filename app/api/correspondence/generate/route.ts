import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { templateService, correspondenceService } from '@/lib/services/database';
import { sanitizeForDatabase } from '@/lib/utils/sanitize';
import { z } from 'zod';

// Validation schema
const generateCorrespondenceSchema = z.object({
  templateId: z.string().min(1),
  tenantId: z.string().min(1),
  variables: z.record(z.string(), z.string()).optional(), // Dynamic variables for template substitution
});

// Template variable substitution function
function substituteVariables(template: string, variables: Record<string, string> = {}): string {
  let result = template;

  // Common variables that can be substituted
  const commonVars = {
    '{{current_date}}': new Date().toLocaleDateString(),
    '{{current_year}}': new Date().getFullYear().toString(),
    ...variables,
  };

  // Replace all variables
  Object.entries(commonVars).forEach(([key, value]) => {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
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

    // Get the template
    const template = await templateService.getById(validatedData.templateId);
    if (!template) {
      return createErrorResponse(new Error('Template not found'), 404, request);
    }

    // Substitute variables in subject and body
    const processedSubject = substituteVariables(template.subject, validatedData.variables);
    const processedContent = substituteVariables(template.content, validatedData.variables);

    // Create correspondence record
    const correspondence = await correspondenceService.create(userId, {
      tenantId: validatedData.tenantId,
      templateId: validatedData.templateId,
      subject: processedSubject,
      content: processedContent,
      status: 'draft', // Start as draft, can be sent later
    });

    return createSuccessResponse({
      ...correspondence,
      originalTemplate: {
        id: template.id,
        name: template.name,
        type: template.type,
      },
    }, 201);
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

// Main handler
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
