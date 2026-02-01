/**
 * Document Management Service
 * Handles document storage, templates, PDF generation, and versioning
 */

import { getPrismaClient } from './database/database';
import { writeFile, readFile, mkdir, unlink, stat } from 'fs/promises';
import { join, extname, dirname } from 'path';
import { existsSync } from 'fs';

// ============================================================================
// Types
// ============================================================================

export type DocumentType = 
  | 'contract' 
  | 'invoice' 
  | 'receipt' 
  | 'photo' 
  | 'floor_plan' 
  | 'certificate' 
  | 'other';

export interface Document {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: DocumentType;
  mimeType: string;
  storagePath: string;
  fileSize: number;
  propertyId?: string;
  propertyName?: string;
  unitId?: string;
  unitNumber?: string;
  ownerId?: string;
  ownerName?: string;
  tenantId?: string;
  tenantName?: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentData {
  name: string;
  description?: string;
  type: DocumentType;
  mimeType: string;
  fileContent: Buffer | string;
  propertyId?: string;
  unitId?: string;
  ownerId?: string;
  tenantId?: string;
}

export interface UpdateDocumentData {
  name?: string;
  description?: string;
  type?: DocumentType;
  propertyId?: string | null;
  unitId?: string | null;
  ownerId?: string | null;
  tenantId?: string | null;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  storagePath: string;
  fileSize: number;
  createdAt: string;
  createdBy: string;
  changeNote?: string;
}

export interface DocumentFilter {
  type?: DocumentType;
  propertyId?: string;
  unitId?: string;
  ownerId?: string;
  tenantId?: string;
  search?: string;
}

// ============================================================================
// Document Template Types
// ============================================================================

export interface LeaseTemplateData {
  // Property Info
  propertyName: string;
  propertyAddress: string;
  unitNumber?: string;
  
  // Tenant Info
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  tenantAddress?: string;
  
  // Owner/Landlord Info
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  
  // Lease Terms
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  currency: string;
  
  // Additional Terms
  paymentDueDay?: number;
  lateFeePercentage?: number;
  lateFeeGracePeriod?: number;
  petPolicy?: string;
  utilities?: string[];
  parkingSpaces?: number;
  specialTerms?: string[];
  
  // Signatures
  signatureDate?: string;
}

export interface RentReceiptTemplateData {
  // Receipt Info
  receiptNumber: string;
  receiptDate: string;
  
  // Payment Info
  paymentAmount: number;
  paymentMethod?: string;
  paymentPeriod: string;
  currency: string;
  
  // Tenant Info
  tenantName: string;
  tenantAddress?: string;
  
  // Property Info
  propertyName: string;
  propertyAddress: string;
  unitNumber?: string;
  
  // Landlord Info
  landlordName: string;
  landlordAddress?: string;
  landlordPhone?: string;
}

export interface NoticeTemplateData {
  noticeType: 'late_payment' | 'lease_violation' | 'eviction' | 'rent_increase' | 'lease_renewal' | 'general';
  recipientName: string;
  recipientAddress: string;
  propertyAddress: string;
  unitNumber?: string;
  issueDate: string;
  dueDate?: string;
  amount?: number;
  currency?: string;
  description: string;
  senderName: string;
  senderTitle?: string;
}

// ============================================================================
// Storage Configuration
// ============================================================================

const STORAGE_BASE_PATH = process.env.DOCUMENT_STORAGE_PATH || './uploads/documents';
const MAX_FILE_SIZE = parseInt(process.env.MAX_DOCUMENT_SIZE || '10485760', 10); // 10MB default
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'application/json',
];

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Ensure directory exists
 */
async function ensureDirectory(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generate unique filename
 */
function generateFileName(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = extname(originalName);
  const baseName = originalName.replace(ext, '').substring(0, 50).replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${userId}_${timestamp}_${randomStr}_${baseName}${ext}`;
}

/**
 * Get storage path for a document
 */
function getStoragePath(userId: string, fileName: string, type: DocumentType): string {
  const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  return join(STORAGE_BASE_PATH, userId, type, yearMonth, fileName);
}

/**
 * Validate file
 */
function validateFile(mimeType: string, fileSize: number): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed: ${fileSize} > ${MAX_FILE_SIZE}`);
  }
}

// ============================================================================
// Document Service
// ============================================================================

export const documentService = {
  /**
   * Get all documents for a user with optional filters
   */
  async getAll(userId: string, filters?: DocumentFilter): Promise<Document[]> {
    const prisma = getPrismaClient();
    
    const where: Record<string, unknown> = { userId };
    
    if (filters?.type) where.type = filters.type;
    if (filters?.propertyId) where.propertyId = filters.propertyId;
    if (filters?.unitId) where.unitId = filters.unitId;
    if (filters?.ownerId) where.ownerId = filters.ownerId;
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }
    
    const documents = await prisma.document.findMany({
      where,
      include: {
        property: { select: { name: true } },
        unit: { select: { number: true } },
        owner: { select: { name: true } },
        tenant: { select: { name: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });
    
    return documents.map(doc => ({
      id: doc.id,
      userId: doc.userId,
      name: doc.name,
      description: doc.description || undefined,
      type: doc.type as DocumentType,
      mimeType: doc.mimeType,
      storagePath: doc.storagePath,
      fileSize: doc.fileSize,
      propertyId: doc.propertyId || undefined,
      propertyName: doc.property?.name,
      unitId: doc.unitId || undefined,
      unitNumber: doc.unit?.number,
      ownerId: doc.ownerId || undefined,
      ownerName: doc.owner?.name,
      tenantId: doc.tenantId || undefined,
      tenantName: doc.tenant?.name,
      uploadedAt: doc.uploadedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));
  },

  /**
   * Get a single document by ID
   */
  async getById(userId: string, id: string): Promise<Document | null> {
    const prisma = getPrismaClient();
    
    const doc = await prisma.document.findFirst({
      where: { id, userId },
      include: {
        property: { select: { name: true } },
        unit: { select: { number: true } },
        owner: { select: { name: true } },
        tenant: { select: { name: true } },
      },
    });
    
    if (!doc) return null;
    
    return {
      id: doc.id,
      userId: doc.userId,
      name: doc.name,
      description: doc.description || undefined,
      type: doc.type as DocumentType,
      mimeType: doc.mimeType,
      storagePath: doc.storagePath,
      fileSize: doc.fileSize,
      propertyId: doc.propertyId || undefined,
      propertyName: doc.property?.name,
      unitId: doc.unitId || undefined,
      unitNumber: doc.unit?.number,
      ownerId: doc.ownerId || undefined,
      ownerName: doc.owner?.name,
      tenantId: doc.tenantId || undefined,
      tenantName: doc.tenant?.name,
      uploadedAt: doc.uploadedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },

  /**
   * Upload and create a new document
   */
  async create(userId: string, data: CreateDocumentData): Promise<Document> {
    const prisma = getPrismaClient();
    
    // Convert string content to buffer if needed
    const content = typeof data.fileContent === 'string' 
      ? Buffer.from(data.fileContent, 'base64')
      : data.fileContent;
    
    const fileSize = content.length;
    
    // Validate file
    validateFile(data.mimeType, fileSize);
    
    // Generate storage path
    const fileName = generateFileName(data.name, userId);
    const storagePath = getStoragePath(userId, fileName, data.type);
    
    // Ensure directory exists and write file
    await ensureDirectory(dirname(storagePath));
    await writeFile(storagePath, content);
    
    // Create database record
    const doc = await prisma.document.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        type: data.type,
        mimeType: data.mimeType,
        storagePath,
        fileSize,
        propertyId: data.propertyId || null,
        unitId: data.unitId || null,
        ownerId: data.ownerId || null,
        tenantId: data.tenantId || null,
      },
      include: {
        property: { select: { name: true } },
        unit: { select: { number: true } },
        owner: { select: { name: true } },
        tenant: { select: { name: true } },
      },
    });
    
    return {
      id: doc.id,
      userId: doc.userId,
      name: doc.name,
      description: doc.description || undefined,
      type: doc.type as DocumentType,
      mimeType: doc.mimeType,
      storagePath: doc.storagePath,
      fileSize: doc.fileSize,
      propertyId: doc.propertyId || undefined,
      propertyName: doc.property?.name,
      unitId: doc.unitId || undefined,
      unitNumber: doc.unit?.number,
      ownerId: doc.ownerId || undefined,
      ownerName: doc.owner?.name,
      tenantId: doc.tenantId || undefined,
      tenantName: doc.tenant?.name,
      uploadedAt: doc.uploadedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },

  /**
   * Update document metadata
   */
  async update(userId: string, id: string, data: UpdateDocumentData): Promise<Document | null> {
    const prisma = getPrismaClient();
    
    // Check if document exists and belongs to user
    const existing = await prisma.document.findFirst({
      where: { id, userId },
    });
    
    if (!existing) return null;
    
    const doc = await prisma.document.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        propertyId: data.propertyId,
        unitId: data.unitId,
        ownerId: data.ownerId,
        tenantId: data.tenantId,
      },
      include: {
        property: { select: { name: true } },
        unit: { select: { number: true } },
        owner: { select: { name: true } },
        tenant: { select: { name: true } },
      },
    });
    
    return {
      id: doc.id,
      userId: doc.userId,
      name: doc.name,
      description: doc.description || undefined,
      type: doc.type as DocumentType,
      mimeType: doc.mimeType,
      storagePath: doc.storagePath,
      fileSize: doc.fileSize,
      propertyId: doc.propertyId || undefined,
      propertyName: doc.property?.name,
      unitId: doc.unitId || undefined,
      unitNumber: doc.unit?.number,
      ownerId: doc.ownerId || undefined,
      ownerName: doc.owner?.name,
      tenantId: doc.tenantId || undefined,
      tenantName: doc.tenant?.name,
      uploadedAt: doc.uploadedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  },

  /**
   * Delete a document
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const prisma = getPrismaClient();
    
    const doc = await prisma.document.findFirst({
      where: { id, userId },
    });
    
    if (!doc) return false;
    
    // Delete file from storage
    try {
      await unlink(doc.storagePath);
    } catch {
      // File might not exist, continue with DB deletion
    }
    
    await prisma.document.delete({ where: { id } });
    
    return true;
  },

  /**
   * Get document file content
   */
  async getFileContent(userId: string, id: string): Promise<{ content: Buffer; mimeType: string; fileName: string } | null> {
    const prisma = getPrismaClient();
    
    const doc = await prisma.document.findFirst({
      where: { id, userId },
    });
    
    if (!doc) return null;
    
    try {
      const content = await readFile(doc.storagePath);
      return {
        content,
        mimeType: doc.mimeType,
        fileName: doc.name,
      };
    } catch {
      return null;
    }
  },

  /**
   * Get document statistics
   */
  async getStats(userId: string): Promise<{
    totalDocuments: number;
    totalSize: number;
    byType: Record<string, number>;
  }> {
    const prisma = getPrismaClient();
    
    const documents = await prisma.document.findMany({
      where: { userId },
      select: { type: true, fileSize: true },
    });
    
    const byType: Record<string, number> = {};
    let totalSize = 0;
    
    for (const doc of documents) {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
      totalSize += doc.fileSize;
    }
    
    return {
      totalDocuments: documents.length,
      totalSize,
      byType,
    };
  },
};

// ============================================================================
// Document Template Generator
// ============================================================================

export const templateGenerator = {
  /**
   * Generate a lease agreement document (HTML format)
   */
  generateLeaseAgreement(data: LeaseTemplateData): string {
    const currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency || 'USD',
    });

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Residential Lease Agreement</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      margin-bottom: 30px;
      text-transform: uppercase;
    }
    h2 {
      font-size: 16px;
      margin-top: 25px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .parties {
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 20px;
    }
    .signature-block {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature-line {
      width: 45%;
    }
    .signature-line .line {
      border-bottom: 1px solid #000;
      height: 40px;
      margin-bottom: 5px;
    }
    .signature-line .label {
      font-size: 12px;
    }
    ul {
      margin: 10px 0;
      padding-left: 25px;
    }
    .highlight {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>Residential Lease Agreement</h1>

  <div class="parties">
    <p>This Residential Lease Agreement ("Agreement") is entered into as of 
    <span class="highlight">${data.signatureDate ? formatDate(data.signatureDate) : '_______________'}</span>, 
    by and between:</p>
    
    <p><strong>LANDLORD:</strong> ${data.ownerName}<br>
    ${data.ownerAddress ? `Address: ${data.ownerAddress}<br>` : ''}
    ${data.ownerEmail ? `Email: ${data.ownerEmail}<br>` : ''}
    ${data.ownerPhone ? `Phone: ${data.ownerPhone}` : ''}</p>
    
    <p><strong>TENANT:</strong> ${data.tenantName}<br>
    ${data.tenantAddress ? `Current Address: ${data.tenantAddress}<br>` : ''}
    Email: ${data.tenantEmail}<br>
    ${data.tenantPhone ? `Phone: ${data.tenantPhone}` : ''}</p>
  </div>

  <h2>1. Property</h2>
  <div class="section">
    <p>The Landlord agrees to rent to the Tenant the property located at:</p>
    <p class="highlight">${data.propertyAddress}${data.unitNumber ? `, Unit ${data.unitNumber}` : ''}</p>
    <p>(hereinafter referred to as the "Premises")</p>
  </div>

  <h2>2. Term</h2>
  <div class="section">
    <p>The lease term shall begin on <span class="highlight">${formatDate(data.startDate)}</span> 
    and end on <span class="highlight">${formatDate(data.endDate)}</span>.</p>
  </div>

  <h2>3. Rent</h2>
  <div class="section">
    <p>The Tenant agrees to pay rent in the amount of 
    <span class="highlight">${currencyFormatter.format(data.monthlyRent)}</span> per month.</p>
    <p>Rent is due on the <span class="highlight">${data.paymentDueDay || 1}${getOrdinalSuffix(data.paymentDueDay || 1)}</span> day of each month.</p>
    ${data.lateFeePercentage ? `<p>A late fee of ${data.lateFeePercentage}% will be charged if rent is not received within ${data.lateFeeGracePeriod || 5} days of the due date.</p>` : ''}
  </div>

  <h2>4. Security Deposit</h2>
  <div class="section">
    <p>The Tenant shall pay a security deposit of 
    <span class="highlight">${currencyFormatter.format(data.securityDeposit)}</span> 
    upon signing this Agreement.</p>
    <p>The security deposit will be returned within 30 days after the termination of this lease, 
    minus any deductions for damages beyond normal wear and tear.</p>
  </div>

  ${data.utilities && data.utilities.length > 0 ? `
  <h2>5. Utilities</h2>
  <div class="section">
    <p>The following utilities are included in the rent:</p>
    <ul>
      ${data.utilities.map(u => `<li>${u}</li>`).join('\n      ')}
    </ul>
    <p>All other utilities shall be the responsibility of the Tenant.</p>
  </div>
  ` : ''}

  ${data.petPolicy ? `
  <h2>${data.utilities ? '6' : '5'}. Pet Policy</h2>
  <div class="section">
    <p>${data.petPolicy}</p>
  </div>
  ` : ''}

  ${data.parkingSpaces !== undefined ? `
  <h2>Parking</h2>
  <div class="section">
    <p>The Tenant is entitled to <span class="highlight">${data.parkingSpaces}</span> parking space(s).</p>
  </div>
  ` : ''}

  ${data.specialTerms && data.specialTerms.length > 0 ? `
  <h2>Additional Terms</h2>
  <div class="section">
    <ul>
      ${data.specialTerms.map(t => `<li>${t}</li>`).join('\n      ')}
    </ul>
  </div>
  ` : ''}

  <h2>General Provisions</h2>
  <div class="section">
    <p>1. The Tenant agrees to maintain the Premises in good condition and to notify the Landlord promptly of any needed repairs.</p>
    <p>2. The Tenant shall not make any alterations to the Premises without the prior written consent of the Landlord.</p>
    <p>3. The Tenant shall not sublet the Premises or assign this Agreement without the prior written consent of the Landlord.</p>
    <p>4. The Landlord or their agents may enter the Premises with reasonable notice for inspections, repairs, or to show the property to prospective tenants or buyers.</p>
  </div>

  <div class="signature-block">
    <div class="signature-line">
      <div class="line"></div>
      <div class="label">Landlord Signature</div>
      <p>${data.ownerName}</p>
      <p>Date: _______________</p>
    </div>
    <div class="signature-line">
      <div class="line"></div>
      <div class="label">Tenant Signature</div>
      <p>${data.tenantName}</p>
      <p>Date: _______________</p>
    </div>
  </div>
</body>
</html>`;
  },

  /**
   * Generate a rent receipt document (HTML format)
   */
  generateRentReceipt(data: RentReceiptTemplateData): string {
    const currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency || 'USD',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rent Receipt - ${data.receiptNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
    }
    .receipt-number {
      font-size: 14px;
      color: #666;
      margin-top: 10px;
    }
    .details {
      margin: 30px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .label {
      font-weight: bold;
      color: #555;
    }
    .amount {
      font-size: 24px;
      font-weight: bold;
      color: #2e7d32;
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
    }
    .signature-line {
      margin-top: 40px;
      border-top: 1px solid #333;
      width: 200px;
      padding-top: 5px;
      font-size: 12px;
    }
    .stamp {
      text-align: center;
      padding: 15px;
      border: 2px solid #2e7d32;
      color: #2e7d32;
      font-weight: bold;
      font-size: 18px;
      margin: 20px auto;
      width: fit-content;
      transform: rotate(-5deg);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>RENT RECEIPT</h1>
    <div class="receipt-number">Receipt #${data.receiptNumber}</div>
  </div>

  <div class="stamp">PAID</div>

  <div class="amount">
    ${currencyFormatter.format(data.paymentAmount)}
  </div>

  <div class="details">
    <div class="row">
      <span class="label">Date Received:</span>
      <span>${new Date(data.receiptDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
    <div class="row">
      <span class="label">Payment Period:</span>
      <span>${data.paymentPeriod}</span>
    </div>
    ${data.paymentMethod ? `
    <div class="row">
      <span class="label">Payment Method:</span>
      <span>${data.paymentMethod}</span>
    </div>
    ` : ''}
    <div class="row">
      <span class="label">Received From:</span>
      <span>${data.tenantName}</span>
    </div>
    ${data.tenantAddress ? `
    <div class="row">
      <span class="label">Tenant Address:</span>
      <span>${data.tenantAddress}</span>
    </div>
    ` : ''}
    <div class="row">
      <span class="label">Property:</span>
      <span>${data.propertyAddress}${data.unitNumber ? `, Unit ${data.unitNumber}` : ''}</span>
    </div>
  </div>

  <div class="footer">
    <p><strong>Received by:</strong> ${data.landlordName}</p>
    ${data.landlordAddress ? `<p>${data.landlordAddress}</p>` : ''}
    ${data.landlordPhone ? `<p>Phone: ${data.landlordPhone}</p>` : ''}
    
    <div class="signature-line">
      Authorized Signature
    </div>
  </div>
</body>
</html>`;
  },

  /**
   * Generate a notice document (HTML format)
   */
  generateNotice(data: NoticeTemplateData): string {
    const noticeTitle = {
      late_payment: 'NOTICE OF LATE PAYMENT',
      lease_violation: 'NOTICE OF LEASE VIOLATION',
      eviction: 'NOTICE TO VACATE',
      rent_increase: 'NOTICE OF RENT INCREASE',
      lease_renewal: 'NOTICE OF LEASE RENEWAL',
      general: 'NOTICE TO TENANT',
    };

    const currencyFormatter = data.currency 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency })
      : null;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${noticeTitle[data.noticeType]}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    h1 {
      font-size: 24px;
      text-transform: uppercase;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .date {
      text-align: right;
      margin-bottom: 30px;
    }
    .recipient {
      margin-bottom: 30px;
    }
    .content {
      margin: 30px 0;
      line-height: 1.8;
    }
    .highlight {
      font-weight: bold;
    }
    .important {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .signature {
      margin-top: 50px;
    }
    .signature-line {
      margin-top: 40px;
      border-top: 1px solid #333;
      width: 200px;
      padding-top: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${noticeTitle[data.noticeType]}</h1>
  </div>

  <div class="date">
    <p><strong>Date:</strong> ${new Date(data.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="recipient">
    <p><strong>To:</strong> ${data.recipientName}</p>
    <p>${data.recipientAddress}</p>
    <p><strong>Property:</strong> ${data.propertyAddress}${data.unitNumber ? `, Unit ${data.unitNumber}` : ''}</p>
  </div>

  <div class="content">
    <p>Dear ${data.recipientName},</p>
    
    <p>${data.description}</p>

    ${data.amount && currencyFormatter ? `
    <div class="important">
      <p><strong>Amount Due:</strong> ${currencyFormatter.format(data.amount)}</p>
      ${data.dueDate ? `<p><strong>Due By:</strong> ${new Date(data.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
    </div>
    ` : ''}

    ${data.dueDate && !data.amount ? `
    <p class="highlight">Please respond by: ${new Date(data.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    ` : ''}

    <p>If you have any questions regarding this notice, please contact us immediately.</p>
  </div>

  <div class="signature">
    <p>Sincerely,</p>
    <div class="signature-line">
      <p>${data.senderName}</p>
      ${data.senderTitle ? `<p>${data.senderTitle}</p>` : ''}
    </div>
  </div>
</body>
</html>`;
  },
};

// Helper function for ordinal suffixes
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// Document Version Service (for future expansion)
// ============================================================================

export const versionService = {
  /**
   * Create a new version of a document
   * Note: This is a simplified implementation. In production, you'd want
   * a separate DocumentVersion table to track all versions.
   */
  async createVersion(
    userId: string, 
    documentId: string, 
    newContent: Buffer,
    changeNote?: string
  ): Promise<Document | null> {
    const prisma = getPrismaClient();
    
    // Get existing document
    const existing = await prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    
    if (!existing) return null;
    
    // Archive old version by renaming
    const timestamp = Date.now();
    const oldPath = existing.storagePath;
    const archivedPath = oldPath.replace(/(\.[^.]+)$/, `.v${timestamp}$1`);
    
    try {
      // Copy old file to archive location
      const oldContent = await readFile(oldPath);
      await ensureDirectory(dirname(archivedPath));
      await writeFile(archivedPath, oldContent);
      
      // Write new content
      await writeFile(oldPath, newContent);
      
      // Update database record
      const doc = await prisma.document.update({
        where: { id: documentId },
        data: {
          fileSize: newContent.length,
        },
        include: {
          property: { select: { name: true } },
          unit: { select: { number: true } },
          owner: { select: { name: true } },
          tenant: { select: { name: true } },
        },
      });
      
      return {
        id: doc.id,
        userId: doc.userId,
        name: doc.name,
        description: doc.description || undefined,
        type: doc.type as DocumentType,
        mimeType: doc.mimeType,
        storagePath: doc.storagePath,
        fileSize: doc.fileSize,
        propertyId: doc.propertyId || undefined,
        propertyName: doc.property?.name,
        unitId: doc.unitId || undefined,
        unitNumber: doc.unit?.number,
        ownerId: doc.ownerId || undefined,
        ownerName: doc.owner?.name,
        tenantId: doc.tenantId || undefined,
        tenantName: doc.tenant?.name,
        uploadedAt: doc.uploadedAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    } catch {
      return null;
    }
  },
};
