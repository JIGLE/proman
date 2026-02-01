/**
 * SAF-T PT Export API
 * POST /api/tax/saft-pt - Generate SAF-T PT XML export
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/services/auth/auth-middleware';
import { z } from 'zod';
import { generateSAFTPT, validateSAFTData, validateNIF, SAFTExportResult } from '@/lib/tax/saft-pt';
import { createSuccessResponse, createErrorResponse, ValidationError } from '@/lib/utils/error-handling';

const SAFTExportSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  startMonth: z.number().int().min(1).max(12).optional().default(1),
  endMonth: z.number().int().min(1).max(12).optional().default(12),
  companyInfo: z.object({
    nif: z.string().length(9).refine(validateNIF, { message: 'Invalid Portuguese NIF' }),
    name: z.string().min(2),
    address: z.object({
      buildingNumber: z.string().optional(),
      streetName: z.string().optional(),
      addressDetail: z.string().min(1),
      city: z.string().min(1),
      postalCode: z.string().regex(/^\d{4}-\d{3}$/, { message: 'Invalid Portuguese postal code (format: XXXX-XXX)' }),
      region: z.string().optional(),
      country: z.string().length(2).default('PT'),
    }),
    taxEntity: z.string().optional(),
  }),
  includePayments: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  
  try {
    const body = await request.json();
    const validatedData = SAFTExportSchema.safeParse(body);
    
    if (!validatedData.success) {
      return createErrorResponse(new ValidationError(validatedData.error.issues[0]?.message || 'Validation failed'), 400, request);
    }
    
    const options = validatedData.data;
    
    // Additional validation
    const validation = validateSAFTData({
      ...options,
      companyInfo: {
        ...options.companyInfo,
        address: {
          ...options.companyInfo.address,
          country: options.companyInfo.address.country || 'PT',
        },
      },
    });
    
    if (!validation.valid) {
      return createErrorResponse(new ValidationError(validation.errors.join('; ')), 400, request);
    }
    
    // Generate SAF-T XML
    const xml = await generateSAFTPT(userId, {
      ...options,
      companyInfo: {
        ...options.companyInfo,
        address: {
          ...options.companyInfo.address,
          country: options.companyInfo.address.country || 'PT',
        },
      },
    });
    
    // Count invoices and calculate totals from the XML
    const invoiceMatches = xml.match(/<Invoice>/g);
    const invoiceCount = invoiceMatches?.length || 0;
    
    // Extract total credit for amount calculation
    const totalCreditMatch = xml.match(/<TotalCredit>([^<]+)<\/TotalCredit>/);
    const totalAmount = totalCreditMatch ? parseFloat(totalCreditMatch[1]) : 0;
    
    // Generate filename
    const filename = `SAF-T_${options.companyInfo.nif}_${options.fiscalYear}_${options.startMonth.toString().padStart(2, '0')}-${options.endMonth.toString().padStart(2, '0')}.xml`;
    
    const result: SAFTExportResult = {
      success: true,
      xml,
      filename,
      invoiceCount,
      totalAmount,
      period: {
        fiscalYear: options.fiscalYear,
        startDate: `${options.fiscalYear}-${options.startMonth.toString().padStart(2, '0')}-01`,
        endDate: `${options.fiscalYear}-${options.endMonth.toString().padStart(2, '0')}-${new Date(options.fiscalYear, options.endMonth, 0).getDate()}`,
      },
    };
    
    return createSuccessResponse(result);
  } catch (error) {
    console.error('SAF-T export error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to generate SAF-T export'),
      500,
      request
    );
  }
}

/**
 * GET /api/tax/saft-pt - Get SAF-T export info/requirements
 */
export async function GET(request: NextRequest): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  
  return createSuccessResponse({
    version: '1.04_01',
    description: 'SAF-T PT (Standard Audit File for Tax - Portugal)',
    requirements: {
      companyInfo: {
        nif: 'Valid 9-digit Portuguese NIF (Número de Identificação Fiscal)',
        name: 'Company/landlord legal name',
        address: {
          addressDetail: 'Full address line',
          city: 'City name',
          postalCode: 'Portuguese postal code (format: XXXX-XXX)',
          country: 'Country code (default: PT)',
        },
      },
      period: {
        fiscalYear: 'Year (2000 - current year + 1)',
        startMonth: 'Start month (1-12, default: 1)',
        endMonth: 'End month (1-12, default: 12)',
      },
    },
    taxExemptionCodes: {
      M07: 'Isento nos termos do art.º 9.º do CIVA (residential rental exemption)',
    },
    documentTypes: {
      FT: 'Fatura (Invoice)',
      FS: 'Fatura Simplificada (Simplified Invoice)',
      NC: 'Nota de Crédito (Credit Note)',
      ND: 'Nota de Débito (Debit Note)',
      RG: 'Recibo (Receipt)',
    },
    notes: [
      'Residential rental income is typically exempt from IVA (VAT) under Article 9 of CIVA',
      'This export is for informational purposes - consult a tax professional for official submissions',
      'For certified software requirements, contact the Portuguese Tax Authority (AT)',
    ],
  });
}
