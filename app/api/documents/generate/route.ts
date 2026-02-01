import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { templateGenerator, type LeaseTemplateData, type RentReceiptTemplateData, type NoticeTemplateData } from '@/lib/services/document-service';
import { pdfGenerator } from '@/lib/services/pdf-generator';
import { sanitizeForDatabase, sanitizeNumber } from '@/lib/utils/sanitize';
import { z } from 'zod';

// Validation schemas
const leaseTemplateSchema = z.object({
  propertyName: z.string().min(1),
  propertyAddress: z.string().min(1),
  unitNumber: z.string().optional(),
  tenantName: z.string().min(1),
  tenantEmail: z.string().email(),
  tenantPhone: z.string().optional(),
  tenantAddress: z.string().optional(),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email().optional(),
  ownerPhone: z.string().optional(),
  ownerAddress: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  monthlyRent: z.number().min(0),
  securityDeposit: z.number().min(0),
  currency: z.string().default('USD'),
  paymentDueDay: z.number().min(1).max(31).optional(),
  lateFeePercentage: z.number().min(0).max(100).optional(),
  lateFeeGracePeriod: z.number().min(0).max(30).optional(),
  petPolicy: z.string().optional(),
  utilities: z.array(z.string()).optional(),
  parkingSpaces: z.number().min(0).optional(),
  specialTerms: z.array(z.string()).optional(),
  signatureDate: z.string().optional(),
});

const receiptTemplateSchema = z.object({
  receiptNumber: z.string().min(1),
  receiptDate: z.string(),
  paymentAmount: z.number().min(0),
  paymentMethod: z.string().optional(),
  paymentPeriod: z.string().min(1),
  currency: z.string().default('USD'),
  tenantName: z.string().min(1),
  tenantAddress: z.string().optional(),
  propertyName: z.string().min(1),
  propertyAddress: z.string().min(1),
  unitNumber: z.string().optional(),
  landlordName: z.string().min(1),
  landlordAddress: z.string().optional(),
  landlordPhone: z.string().optional(),
});

const noticeTemplateSchema = z.object({
  noticeType: z.enum(['late_payment', 'lease_violation', 'eviction', 'rent_increase', 'lease_renewal', 'general']),
  recipientName: z.string().min(1),
  recipientAddress: z.string().min(1),
  propertyAddress: z.string().min(1),
  unitNumber: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  description: z.string().min(1),
  senderName: z.string().min(1),
  senderTitle: z.string().optional(),
});

const generateRequestSchema = z.object({
  templateType: z.enum(['lease', 'receipt', 'notice']),
  format: z.enum(['html', 'pdf']).default('html'),
  data: z.record(z.string(), z.unknown()),
});

// POST /api/documents/generate - Generate a document from template
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    
    // Validate base request
    const baseRequest = generateRequestSchema.parse(body);
    const { templateType, format, data } = baseRequest;

    let html: string;
    let fileName: string;

    switch (templateType) {
      case 'lease': {
        // Sanitize and validate lease data
        const sanitizedData = {
          ...data,
          propertyName: sanitizeForDatabase(data.propertyName as string),
          propertyAddress: sanitizeForDatabase(data.propertyAddress as string),
          unitNumber: data.unitNumber ? sanitizeForDatabase(data.unitNumber as string) : undefined,
          tenantName: sanitizeForDatabase(data.tenantName as string),
          tenantEmail: sanitizeForDatabase(data.tenantEmail as string),
          tenantPhone: data.tenantPhone ? sanitizeForDatabase(data.tenantPhone as string) : undefined,
          tenantAddress: data.tenantAddress ? sanitizeForDatabase(data.tenantAddress as string) : undefined,
          ownerName: sanitizeForDatabase(data.ownerName as string),
          ownerEmail: data.ownerEmail ? sanitizeForDatabase(data.ownerEmail as string) : undefined,
          ownerPhone: data.ownerPhone ? sanitizeForDatabase(data.ownerPhone as string) : undefined,
          ownerAddress: data.ownerAddress ? sanitizeForDatabase(data.ownerAddress as string) : undefined,
          monthlyRent: sanitizeNumber(data.monthlyRent, 0, 0),
          securityDeposit: sanitizeNumber(data.securityDeposit, 0, 0),
          petPolicy: data.petPolicy ? sanitizeForDatabase(data.petPolicy as string) : undefined,
        };
        
        const validatedData = leaseTemplateSchema.parse(sanitizedData) as LeaseTemplateData;
        html = templateGenerator.generateLeaseAgreement(validatedData);
        fileName = `Lease_Agreement_${validatedData.tenantName.replace(/\s+/g, '_')}_${validatedData.startDate}`;
        break;
      }
      
      case 'receipt': {
        const sanitizedData = {
          ...data,
          receiptNumber: sanitizeForDatabase(data.receiptNumber as string),
          tenantName: sanitizeForDatabase(data.tenantName as string),
          tenantAddress: data.tenantAddress ? sanitizeForDatabase(data.tenantAddress as string) : undefined,
          propertyName: sanitizeForDatabase(data.propertyName as string),
          propertyAddress: sanitizeForDatabase(data.propertyAddress as string),
          unitNumber: data.unitNumber ? sanitizeForDatabase(data.unitNumber as string) : undefined,
          landlordName: sanitizeForDatabase(data.landlordName as string),
          landlordAddress: data.landlordAddress ? sanitizeForDatabase(data.landlordAddress as string) : undefined,
          landlordPhone: data.landlordPhone ? sanitizeForDatabase(data.landlordPhone as string) : undefined,
          paymentPeriod: sanitizeForDatabase(data.paymentPeriod as string),
          paymentAmount: sanitizeNumber(data.paymentAmount, 0, 0),
        };
        
        const validatedData = receiptTemplateSchema.parse(sanitizedData) as RentReceiptTemplateData;
        html = templateGenerator.generateRentReceipt(validatedData);
        fileName = `Rent_Receipt_${validatedData.receiptNumber}`;
        break;
      }
      
      case 'notice': {
        const sanitizedData = {
          ...data,
          recipientName: sanitizeForDatabase(data.recipientName as string),
          recipientAddress: sanitizeForDatabase(data.recipientAddress as string),
          propertyAddress: sanitizeForDatabase(data.propertyAddress as string),
          unitNumber: data.unitNumber ? sanitizeForDatabase(data.unitNumber as string) : undefined,
          description: sanitizeForDatabase(data.description as string),
          senderName: sanitizeForDatabase(data.senderName as string),
          senderTitle: data.senderTitle ? sanitizeForDatabase(data.senderTitle as string) : undefined,
          amount: data.amount ? sanitizeNumber(data.amount, 0, 0) : undefined,
        };
        
        const validatedData = noticeTemplateSchema.parse(sanitizedData) as NoticeTemplateData;
        html = templateGenerator.generateNotice(validatedData);
        fileName = `Notice_${validatedData.noticeType}_${validatedData.issueDate}`;
        break;
      }
      
      default:
        return createErrorResponse(new Error('Invalid template type'), 400, request);
    }

    // Generate output based on format
    if (format === 'pdf') {
      const result = await pdfGenerator.generateFromHTML(html, fileName);
      
      // Convert Buffer to Uint8Array for Response compatibility
      const uint8Array = new Uint8Array(result.buffer);
      
      return new Response(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
          'Content-Length': result.buffer.length.toString(),
        },
      });
    } else {
      // Return HTML
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}.html"`,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        new Error(`Validation error: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`),
        400,
        request
      );
    }
    return createErrorResponse(error as Error, 500, request);
  }
}

// Export handlers
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
