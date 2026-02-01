/**
 * PDF Generation Service
 * Converts HTML templates to PDF documents
 * Uses a lightweight approach with node-html-to-image or falls back to simple text
 */

// ============================================================================
// Types
// ============================================================================

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
}

export interface PDFResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

// ============================================================================
// Simple HTML to PDF using built-in Node.js
// For production, consider using: puppeteer, @react-pdf/renderer, or pdfkit
// ============================================================================

/**
 * Convert HTML to a simple text representation
 * This is a fallback when full PDF generation is not available
 */
function htmlToText(html: string): string {
  // Remove style and script tags
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Replace common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  
  // Replace line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
}

/**
 * Create a simple PDF-like structure using a basic format
 * This creates a basic PDF without external dependencies
 */
function createSimplePDF(content: string, title: string): Buffer {
  // PDF header
  const header = '%PDF-1.4\n';
  
  // Object 1: Catalog
  const catalog = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  
  // Object 2: Pages
  const pages = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  
  // Prepare content for PDF (escape special characters)
  const escapedContent = content
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .split('\n');
  
  // Build text content stream
  let streamContent = 'BT\n/F1 12 Tf\n50 750 Td\n14 TL\n';
  
  // Add title
  streamContent += `(${title.replace(/[()\\]/g, '\\$&')}) Tj\nT*\nT*\n`;
  
  // Add content lines
  for (const line of escapedContent.slice(0, 50)) { // Limit to 50 lines per page
    const safeLine = line.substring(0, 80); // Limit line length
    streamContent += `(${safeLine}) Tj\nT*\n`;
  }
  
  streamContent += 'ET';
  
  // Object 3: Page
  const page = `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] 
   /Resources << /Font << /F1 4 0 R >> >> 
   /Contents 5 0 R >>
endobj
`;
  
  // Object 4: Font
  const font = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  
  // Object 5: Content Stream
  const streamLength = Buffer.byteLength(streamContent, 'utf8');
  const stream = `5 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
`;
  
  // Calculate cross-reference table offsets
  let offset = header.length;
  const offsets = [0]; // Unused first entry
  
  offsets.push(offset); // Object 1
  offset += catalog.length;
  
  offsets.push(offset); // Object 2
  offset += pages.length;
  
  offsets.push(offset); // Object 3
  offset += page.length;
  
  offsets.push(offset); // Object 4
  offset += font.length;
  
  offsets.push(offset); // Object 5
  offset += stream.length;
  
  // Cross-reference table
  let xref = `xref\n0 6\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    xref += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  
  // Trailer
  const trailer = `trailer
<< /Size 6 /Root 1 0 R >>
startxref
${offset}
%%EOF`;
  
  const pdfContent = header + catalog + pages + page + font + stream + xref + trailer;
  
  return Buffer.from(pdfContent, 'utf8');
}

// ============================================================================
// PDF Generation Service
// ============================================================================

export const pdfGenerator = {
  /**
   * Generate PDF from HTML content
   * Falls back to simple PDF if dependencies not available
   */
  async generateFromHTML(
    html: string, 
    fileName: string,
    options?: PDFGenerationOptions
  ): Promise<PDFResult> {
    // Try to use puppeteer if available (optional dependency)
    try {
      // @ts-expect-error puppeteer is an optional dependency
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: options?.format || 'A4',
        landscape: options?.landscape || false,
        margin: options?.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        displayHeaderFooter: options?.displayHeaderFooter || false,
        headerTemplate: options?.headerTemplate,
        footerTemplate: options?.footerTemplate,
        printBackground: true,
      });
      
      await browser.close();
      
      return {
        buffer: Buffer.from(pdfBuffer),
        mimeType: 'application/pdf',
        fileName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
      };
    } catch {
      // Puppeteer not available, use simple fallback
      console.log('Puppeteer not available, using simple PDF generation');
    }
    
    // Fallback: Create simple PDF from text
    const textContent = htmlToText(html);
    const title = fileName.replace(/\.[^.]+$/, '');
    const pdfBuffer = createSimplePDF(textContent, title);
    
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      fileName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
    };
  },

  /**
   * Generate PDF from plain text
   */
  async generateFromText(
    text: string,
    fileName: string,
    title?: string
  ): Promise<PDFResult> {
    const pdfBuffer = createSimplePDF(text, title || fileName);
    
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      fileName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
    };
  },

  /**
   * Get HTML content as-is (for browser-side PDF generation)
   */
  getHTML(html: string, fileName: string): PDFResult {
    return {
      buffer: Buffer.from(html, 'utf8'),
      mimeType: 'text/html',
      fileName: fileName.endsWith('.html') ? fileName : `${fileName}.html`,
    };
  },
};

// ============================================================================
// Document Export Utilities
// ============================================================================

export const documentExport = {
  /**
   * Generate a lease agreement PDF
   */
  async generateLeaseAgreementPDF(
    leaseData: import('./document-service').LeaseTemplateData,
    options?: PDFGenerationOptions
  ): Promise<PDFResult> {
    const { templateGenerator } = await import('./document-service');
    const html = templateGenerator.generateLeaseAgreement(leaseData);
    const fileName = `Lease_Agreement_${leaseData.tenantName.replace(/\s+/g, '_')}_${leaseData.startDate}`;
    
    return pdfGenerator.generateFromHTML(html, fileName, options);
  },

  /**
   * Generate a rent receipt PDF
   */
  async generateRentReceiptPDF(
    receiptData: import('./document-service').RentReceiptTemplateData,
    options?: PDFGenerationOptions
  ): Promise<PDFResult> {
    const { templateGenerator } = await import('./document-service');
    const html = templateGenerator.generateRentReceipt(receiptData);
    const fileName = `Rent_Receipt_${receiptData.receiptNumber}`;
    
    return pdfGenerator.generateFromHTML(html, fileName, options);
  },

  /**
   * Generate a notice PDF
   */
  async generateNoticePDF(
    noticeData: import('./document-service').NoticeTemplateData,
    options?: PDFGenerationOptions
  ): Promise<PDFResult> {
    const { templateGenerator } = await import('./document-service');
    const html = templateGenerator.generateNotice(noticeData);
    const fileName = `Notice_${noticeData.noticeType}_${noticeData.issueDate}`;
    
    return pdfGenerator.generateFromHTML(html, fileName, options);
  },
};
