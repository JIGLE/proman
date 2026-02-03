import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { 
  generateFinancialReport, 
  generateTaxReport, 
  generateRentRoll,
  exportToCSV
} from '@/lib/services/financial-reports';
import { invoiceService } from '@/lib/services/invoice-service';
import { z } from 'zod';

// Validation schema for report request
const reportRequestSchema = z.object({
  type: z.enum(['financial', 'tax', 'rent-roll', 'invoice-summary']),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date').optional(),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  year: z.number().min(2000).max(2100).optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

// GET /api/reports - Get financial reports
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'financial';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = searchParams.get('year');
    const format = searchParams.get('format') || 'json';

    // Validate params
    const params = reportRequestSchema.parse({
      type,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      year: year ? parseInt(year, 10) : undefined,
      format,
    });

    let report: unknown;
    let csvContent: string | null = null;

    switch (params.type) {
      case 'financial': {
        // Default to current month if no dates provided
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const start = params.startDate || defaultStart.toISOString().split('T')[0];
        const end = params.endDate || defaultEnd.toISOString().split('T')[0];
        
        report = await generateFinancialReport(userId, start, end);
        
        if (params.format === 'csv') {
          csvContent = exportToCSV(report as Awaited<ReturnType<typeof generateFinancialReport>>);
        }
        break;
      }
      
      case 'tax': {
        const taxYear = params.year || new Date().getFullYear();
        report = await generateTaxReport(userId, taxYear);
        break;
      }
      
      case 'rent-roll': {
        report = await generateRentRoll(userId);
        break;
      }
      
      case 'invoice-summary': {
        report = await invoiceService.getSummary(
          userId,
          params.startDate,
          params.endDate
        );
        break;
      }
    }

    // Return CSV if requested
    if (params.format === 'csv' && csvContent) {
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${params.type}-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return createSuccessResponse(report);
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

// POST /api/reports - Generate a custom report
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const body = await request.json();

    // Validate input
    const params = reportRequestSchema.parse(body);

    let report: unknown;

    switch (params.type) {
      case 'financial': {
        if (!params.startDate || !params.endDate) {
          return createErrorResponse(
            new Error('startDate and endDate are required for financial reports'),
            400,
            request
          );
        }
        report = await generateFinancialReport(userId, params.startDate, params.endDate);
        break;
      }
      
      case 'tax': {
        const taxYear = params.year || new Date().getFullYear();
        report = await generateTaxReport(userId, taxYear);
        break;
      }
      
      case 'rent-roll': {
        report = await generateRentRoll(userId);
        break;
      }
      
      case 'invoice-summary': {
        report = await invoiceService.getSummary(
          userId,
          params.startDate,
          params.endDate
        );
        break;
      }
    }

    // Format output
    if (params.format === 'csv' && params.type === 'financial') {
      const csvContent = exportToCSV(report as Awaited<ReturnType<typeof generateFinancialReport>>);
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${params.type}-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return createSuccessResponse(report);
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

// Main handlers
export const GET = withErrorHandler(handleGet);
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
