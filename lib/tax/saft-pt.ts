/**
 * SAF-T PT (Standard Audit File for Tax - Portugal)
 * 
 * Implementation based on Portaria n.º 321-A/2007 and subsequent updates.
 * This module generates SAF-T XML files compliant with Portuguese Tax Authority (AT) requirements.
 * 
 * @see https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/SAFT_PT/
 */

import { getPrismaClient } from '../database';

// SAF-T PT Version
const SAFT_VERSION = '1.04_01';
const SAFT_NAMESPACE = 'urn:OECD:StandardAuditFile-Tax:PT_1.04_01';

// Portuguese Tax Codes for Rental Income
export const TAX_CODES = {
  // IVA (VAT) - usually exempt for residential rentals
  EXEMPT: 'ISE', // Isento
  STANDARD: 'NOR', // Normal rate (23%)
  REDUCED: 'RED', // Reduced rate (13%)
  INTERMEDIATE: 'INT', // Intermediate rate (6%)
  
  // Withholding tax rates for rental income
  WITHHOLDING_RESIDENTIAL: 25, // 25% for residents
  WITHHOLDING_NON_RESIDENTIAL: 25, // 25% for non-residents (can be different)
} as const;

// Document types in SAF-T
export const DOCUMENT_TYPES = {
  INVOICE: 'FT', // Fatura
  SIMPLIFIED_INVOICE: 'FS', // Fatura Simplificada
  CREDIT_NOTE: 'NC', // Nota de Crédito
  DEBIT_NOTE: 'ND', // Nota de Débito
  RECEIPT: 'RG', // Recibo
} as const;

// Invoice status codes
export const INVOICE_STATUS = {
  NORMAL: 'N',
  CANCELLED: 'A',
  BILLED: 'F',
  SELF_BILLED: 'S',
} as const;

export interface SAFTHeader {
  companyID: string; // NIF
  taxRegistrationNumber: string;
  taxAccountingBasis: 'C' | 'F' | 'I' | 'P' | 'R' | 'S' | 'T';
  companyName: string;
  companyAddress: SAFTAddress;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  currencyCode: string;
  dateCreated: string;
  taxEntity: string;
  productCompanyTaxID: string;
  softwareCertificateNumber: string;
  productID: string;
  productVersion: string;
}

export interface SAFTAddress {
  buildingNumber?: string;
  streetName?: string;
  addressDetail: string;
  city: string;
  postalCode: string;
  region?: string;
  country: string;
}

export interface SAFTCustomer {
  customerID: string;
  accountID: string;
  customerTaxID: string;
  companyName: string;
  billingAddress: SAFTAddress;
  selfBillingIndicator: 0 | 1;
}

export interface SAFTProduct {
  productType: 'P' | 'S' | 'O' | 'E' | 'I';
  productCode: string;
  productGroup?: string;
  productDescription: string;
  productNumberCode: string;
}

export interface SAFTLine {
  lineNumber: number;
  productCode: string;
  productDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  taxPointDate: string;
  description: string;
  creditAmount?: number;
  debitAmount?: number;
  tax: {
    taxType: string;
    taxCountryRegion: string;
    taxCode: string;
    taxPercentage: number;
  };
  taxExemptionReason?: string;
  taxExemptionCode?: string;
  settlementAmount?: number;
}

export interface SAFTInvoice {
  invoiceNo: string;
  ATCUD: string;
  documentStatus: {
    invoiceStatus: string;
    invoiceStatusDate: string;
    sourceID: string;
    sourceBilling: string;
  };
  hash: string;
  hashControl: string;
  period: number;
  invoiceDate: string;
  invoiceType: string;
  selfBillingIndicator: 0 | 1;
  sourceID: string;
  systemEntryDate: string;
  customerID: string;
  shipTo?: {
    deliveryID?: string;
    deliveryDate?: string;
    address?: SAFTAddress;
  };
  lines: SAFTLine[];
  documentTotals: {
    taxPayable: number;
    netTotal: number;
    grossTotal: number;
    currency?: {
      currencyCode: string;
      currencyAmount: number;
      exchangeRate: number;
    };
    payment?: {
      paymentMechanism: string;
      paymentAmount: number;
      paymentDate: string;
    }[];
  };
}

export interface SAFTExportOptions {
  fiscalYear: number;
  startMonth?: number; // 1-12, defaults to 1
  endMonth?: number; // 1-12, defaults to 12
  includePayments?: boolean;
  companyInfo: {
    nif: string;
    name: string;
    address: SAFTAddress;
    taxEntity?: string;
  };
}

/**
 * Validate Portuguese NIF (Número de Identificação Fiscal)
 */
export function validateNIF(nif: string): boolean {
  if (!nif || nif.length !== 9) return false;
  
  // Must start with valid prefix
  const validPrefixes = ['1', '2', '3', '5', '6', '7', '8', '9'];
  if (!validPrefixes.includes(nif.charAt(0))) return false;
  
  // Check digit calculation
  const weights = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  const sum = nif.split('').reduce((acc, digit, index) => {
    return acc + parseInt(digit) * weights[index];
  }, 0);
  
  return sum % 11 === 0;
}

/**
 * Generate ATCUD (Código Único do Documento)
 * Format: [Series Validation Code]-[Sequential Number]
 */
export function generateATCUD(seriesCode: string, sequentialNumber: number): string {
  // In production, the series code is obtained from AT registration
  // For now, we use a placeholder format
  return `${seriesCode}-${sequentialNumber}`;
}

/**
 * Generate document hash as required by Portuguese regulations
 * In production, this should use a certified private key
 */
export function generateDocumentHash(
  invoiceDate: string,
  systemEntryDate: string,
  invoiceNo: string,
  grossTotal: number,
  previousHash?: string
): string {
  // Simplified hash for demonstration
  // Production requires RSA-SHA1 signature with AT-certified key
  const dataToHash = `${invoiceDate};${systemEntryDate};${invoiceNo};${grossTotal.toFixed(2)};${previousHash || ''}`;
  
  // In production, sign with private key
  // const signature = crypto.sign('RSA-SHA1', Buffer.from(dataToHash), privateKey);
  // return signature.toString('base64').substring(0, 4) + signature.toString('base64').slice(-4);
  
  // Placeholder for demonstration
  return 'AAAA';
}

/**
 * Format date for SAF-T (YYYY-MM-DD)
 */
function formatSAFTDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format datetime for SAF-T (YYYY-MM-DDTHH:MM:SS)
 */
function formatSAFTDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('.')[0];
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate SAF-T PT XML export
 */
export async function generateSAFTPT(
  userId: string,
  options: SAFTExportOptions
): Promise<string> {
  const prisma = getPrismaClient();
  const { fiscalYear, startMonth = 1, endMonth = 12, companyInfo } = options;
  
  const startDate = new Date(fiscalYear, startMonth - 1, 1);
  const endDate = new Date(fiscalYear, endMonth, 0); // Last day of endMonth
  
  // Fetch all invoices for the period
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      tenant: true,
      property: true,
      owner: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build unique customers from invoices
  const customersMap = new Map<string, SAFTCustomer>();
  const productsMap = new Map<string, SAFTProduct>();
  
  // Default product for rent
  productsMap.set('RENT', {
    productType: 'S',
    productCode: 'RENT',
    productGroup: 'Services',
    productDescription: 'Property Rental Services',
    productNumberCode: 'RENT',
  });
  
  for (const invoice of invoices) {
    if (invoice.tenant && !customersMap.has(invoice.tenant.id)) {
      // Use property address if available, otherwise use default
      const propertyAddress = invoice.property?.address || 'Morada desconhecida';
      
      customersMap.set(invoice.tenant.id, {
        customerID: invoice.tenant.id,
        accountID: 'Desconhecido',
        customerTaxID: '999999990', // Consumidor final if no NIF
        companyName: invoice.tenant.name,
        billingAddress: {
          addressDetail: propertyAddress,
          city: 'Desconhecida',
          postalCode: '0000-000',
          country: 'PT',
        },
        selfBillingIndicator: 0,
      });
    }
  }
  
  // If no customers, add a generic one
  if (customersMap.size === 0) {
    customersMap.set('CONSUMIDOR_FINAL', {
      customerID: 'CONSUMIDOR_FINAL',
      accountID: 'Desconhecido',
      customerTaxID: '999999990',
      companyName: 'Consumidor Final',
      billingAddress: {
        addressDetail: 'Desconhecido',
        city: 'Desconhecido',
        postalCode: '0000-000',
        country: 'PT',
      },
      selfBillingIndicator: 0,
    });
  }
  
  // Build the XML
  const now = new Date();
  const xml = buildSAFTXML({
    header: {
      companyID: companyInfo.nif,
      taxRegistrationNumber: companyInfo.nif,
      taxAccountingBasis: 'F', // Faturação (Invoicing)
      companyName: companyInfo.name,
      companyAddress: companyInfo.address,
      fiscalYear,
      startDate: formatSAFTDate(startDate),
      endDate: formatSAFTDate(endDate),
      currencyCode: 'EUR',
      dateCreated: formatSAFTDate(now),
      taxEntity: companyInfo.taxEntity || 'Global',
      productCompanyTaxID: '999999999', // ProMan placeholder
      softwareCertificateNumber: '0', // Non-certified software
      productID: 'ProMan/ProMan',
      productVersion: '1.0',
    },
    customers: Array.from(customersMap.values()),
    products: Array.from(productsMap.values()),
    invoices: invoices.map((inv, index) => {
      const grossTotal = inv.amount;
      const taxAmount = 0; // Residential rental usually exempt
      const netTotal = grossTotal - taxAmount;
      
      const invoiceStatus = inv.status === 'cancelled' ? INVOICE_STATUS.CANCELLED : INVOICE_STATUS.NORMAL;
      const invoiceType = inv.amount >= 0 ? DOCUMENT_TYPES.INVOICE : DOCUMENT_TYPES.CREDIT_NOTE;
      
      // Parse metadata for line items
      let lineItems: SAFTLine[] = [];
      try {
        const metadata = inv.metadata ? JSON.parse(inv.metadata) : null;
        if (metadata?.lineItems && Array.isArray(metadata.lineItems)) {
          lineItems = metadata.lineItems.map((item: { description: string; quantity: number; unitPrice: number; total: number }, lineNum: number) => ({
            lineNumber: lineNum + 1,
            productCode: 'RENT',
            productDescription: item.description || 'Renda',
            quantity: item.quantity || 1,
            unitOfMeasure: 'UN',
            unitPrice: item.unitPrice || item.total,
            taxPointDate: formatSAFTDate(inv.createdAt),
            description: item.description || 'Renda mensal',
            creditAmount: inv.amount >= 0 ? item.total : undefined,
            debitAmount: inv.amount < 0 ? Math.abs(item.total) : undefined,
            tax: {
              taxType: 'IVA',
              taxCountryRegion: 'PT',
              taxCode: TAX_CODES.EXEMPT,
              taxPercentage: 0,
            },
            taxExemptionReason: 'M07 - Isento nos termos do art.º 9.º do CIVA',
            taxExemptionCode: 'M07',
          }));
        }
      } catch {
        // Ignore metadata parsing errors
      }
      
      // Default line if no line items
      if (lineItems.length === 0) {
        lineItems = [{
          lineNumber: 1,
          productCode: 'RENT',
          productDescription: inv.description || 'Renda mensal',
          quantity: 1,
          unitOfMeasure: 'UN',
          unitPrice: Math.abs(grossTotal),
          taxPointDate: formatSAFTDate(inv.createdAt),
          description: inv.description || 'Renda mensal',
          creditAmount: inv.amount >= 0 ? Math.abs(grossTotal) : undefined,
          debitAmount: inv.amount < 0 ? Math.abs(grossTotal) : undefined,
          tax: {
            taxType: 'IVA',
            taxCountryRegion: 'PT',
            taxCode: TAX_CODES.EXEMPT,
            taxPercentage: 0,
          },
          taxExemptionReason: 'M07 - Isento nos termos do art.º 9.º do CIVA',
          taxExemptionCode: 'M07',
        }];
      }
      
      return {
        invoiceNo: inv.number,
        ATCUD: generateATCUD('PROMAN', index + 1),
        documentStatus: {
          invoiceStatus,
          invoiceStatusDate: formatSAFTDateTime(inv.updatedAt),
          sourceID: userId,
          sourceBilling: 'P', // Produced by invoicing program
        },
        hash: generateDocumentHash(
          formatSAFTDate(inv.createdAt),
          formatSAFTDateTime(inv.createdAt),
          inv.number,
          grossTotal
        ),
        hashControl: '1',
        period: new Date(inv.createdAt).getMonth() + 1,
        invoiceDate: formatSAFTDate(inv.createdAt),
        invoiceType,
        selfBillingIndicator: 0,
        sourceID: userId,
        systemEntryDate: formatSAFTDateTime(inv.createdAt),
        customerID: inv.tenantId || 'CONSUMIDOR_FINAL',
        lines: lineItems,
        documentTotals: {
          taxPayable: taxAmount,
          netTotal,
          grossTotal: Math.abs(grossTotal),
          payment: inv.paidDate ? [{
            paymentMechanism: 'OU', // Other
            paymentAmount: Math.abs(grossTotal),
            paymentDate: formatSAFTDate(inv.paidDate),
          }] : undefined,
        },
      } as SAFTInvoice;
    }),
  });
  
  return xml;
}

/**
 * Build the complete SAF-T XML document
 */
function buildSAFTXML(data: {
  header: SAFTHeader;
  customers: SAFTCustomer[];
  products: SAFTProduct[];
  invoices: SAFTInvoice[];
}): string {
  const { header, customers, products, invoices } = data;
  
  // Calculate totals
  const totalDebit = invoices.reduce((sum, inv) => {
    return sum + inv.lines.reduce((lineSum, line) => lineSum + (line.debitAmount || 0), 0);
  }, 0);
  
  const totalCredit = invoices.reduce((sum, inv) => {
    return sum + inv.lines.reduce((lineSum, line) => lineSum + (line.creditAmount || 0), 0);
  }, 0);
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="${SAFT_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <AuditFileVersion>${SAFT_VERSION}</AuditFileVersion>
    <CompanyID>${escapeXML(header.companyID)}</CompanyID>
    <TaxRegistrationNumber>${escapeXML(header.taxRegistrationNumber)}</TaxRegistrationNumber>
    <TaxAccountingBasis>${header.taxAccountingBasis}</TaxAccountingBasis>
    <CompanyName>${escapeXML(header.companyName)}</CompanyName>
    <CompanyAddress>
      ${header.companyAddress.buildingNumber ? `<BuildingNumber>${escapeXML(header.companyAddress.buildingNumber)}</BuildingNumber>` : ''}
      ${header.companyAddress.streetName ? `<StreetName>${escapeXML(header.companyAddress.streetName)}</StreetName>` : ''}
      <AddressDetail>${escapeXML(header.companyAddress.addressDetail)}</AddressDetail>
      <City>${escapeXML(header.companyAddress.city)}</City>
      <PostalCode>${escapeXML(header.companyAddress.postalCode)}</PostalCode>
      ${header.companyAddress.region ? `<Region>${escapeXML(header.companyAddress.region)}</Region>` : ''}
      <Country>${header.companyAddress.country}</Country>
    </CompanyAddress>
    <FiscalYear>${header.fiscalYear}</FiscalYear>
    <StartDate>${header.startDate}</StartDate>
    <EndDate>${header.endDate}</EndDate>
    <CurrencyCode>${header.currencyCode}</CurrencyCode>
    <DateCreated>${header.dateCreated}</DateCreated>
    <TaxEntity>${escapeXML(header.taxEntity)}</TaxEntity>
    <ProductCompanyTaxID>${header.productCompanyTaxID}</ProductCompanyTaxID>
    <SoftwareCertificateNumber>${header.softwareCertificateNumber}</SoftwareCertificateNumber>
    <ProductID>${escapeXML(header.productID)}</ProductID>
    <ProductVersion>${header.productVersion}</ProductVersion>
  </Header>
  
  <MasterFiles>
    <Customer>
${customers.map(c => `      <CustomerID>${escapeXML(c.customerID)}</CustomerID>
      <AccountID>${escapeXML(c.accountID)}</AccountID>
      <CustomerTaxID>${escapeXML(c.customerTaxID)}</CustomerTaxID>
      <CompanyName>${escapeXML(c.companyName)}</CompanyName>
      <BillingAddress>
        <AddressDetail>${escapeXML(c.billingAddress.addressDetail)}</AddressDetail>
        <City>${escapeXML(c.billingAddress.city)}</City>
        <PostalCode>${escapeXML(c.billingAddress.postalCode)}</PostalCode>
        <Country>${c.billingAddress.country}</Country>
      </BillingAddress>
      <SelfBillingIndicator>${c.selfBillingIndicator}</SelfBillingIndicator>`).join('\n    </Customer>\n    <Customer>\n')}
    </Customer>
    
    <Product>
${products.map(p => `      <ProductType>${p.productType}</ProductType>
      <ProductCode>${escapeXML(p.productCode)}</ProductCode>
      ${p.productGroup ? `<ProductGroup>${escapeXML(p.productGroup)}</ProductGroup>` : ''}
      <ProductDescription>${escapeXML(p.productDescription)}</ProductDescription>
      <ProductNumberCode>${escapeXML(p.productNumberCode)}</ProductNumberCode>`).join('\n    </Product>\n    <Product>\n')}
    </Product>
  </MasterFiles>
  
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${invoices.length}</NumberOfEntries>
      <TotalDebit>${totalDebit.toFixed(2)}</TotalDebit>
      <TotalCredit>${totalCredit.toFixed(2)}</TotalCredit>
${invoices.map(inv => buildInvoiceXML(inv)).join('\n')}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;
  
  return xml;
}

/**
 * Build XML for a single invoice
 */
function buildInvoiceXML(invoice: SAFTInvoice): string {
  return `      <Invoice>
        <InvoiceNo>${escapeXML(invoice.invoiceNo)}</InvoiceNo>
        <ATCUD>${escapeXML(invoice.ATCUD)}</ATCUD>
        <DocumentStatus>
          <InvoiceStatus>${invoice.documentStatus.invoiceStatus}</InvoiceStatus>
          <InvoiceStatusDate>${invoice.documentStatus.invoiceStatusDate}</InvoiceStatusDate>
          <SourceID>${escapeXML(invoice.documentStatus.sourceID)}</SourceID>
          <SourceBilling>${invoice.documentStatus.sourceBilling}</SourceBilling>
        </DocumentStatus>
        <Hash>${invoice.hash}</Hash>
        <HashControl>${invoice.hashControl}</HashControl>
        <Period>${invoice.period}</Period>
        <InvoiceDate>${invoice.invoiceDate}</InvoiceDate>
        <InvoiceType>${invoice.invoiceType}</InvoiceType>
        <SelfBillingIndicator>${invoice.selfBillingIndicator}</SelfBillingIndicator>
        <SourceID>${escapeXML(invoice.sourceID)}</SourceID>
        <SystemEntryDate>${invoice.systemEntryDate}</SystemEntryDate>
        <CustomerID>${escapeXML(invoice.customerID)}</CustomerID>
${invoice.lines.map(line => `        <Line>
          <LineNumber>${line.lineNumber}</LineNumber>
          <ProductCode>${escapeXML(line.productCode)}</ProductCode>
          <ProductDescription>${escapeXML(line.productDescription)}</ProductDescription>
          <Quantity>${line.quantity}</Quantity>
          <UnitOfMeasure>${line.unitOfMeasure}</UnitOfMeasure>
          <UnitPrice>${line.unitPrice.toFixed(2)}</UnitPrice>
          <TaxPointDate>${line.taxPointDate}</TaxPointDate>
          <Description>${escapeXML(line.description)}</Description>
          ${line.creditAmount !== undefined ? `<CreditAmount>${line.creditAmount.toFixed(2)}</CreditAmount>` : ''}
          ${line.debitAmount !== undefined ? `<DebitAmount>${line.debitAmount.toFixed(2)}</DebitAmount>` : ''}
          <Tax>
            <TaxType>${line.tax.taxType}</TaxType>
            <TaxCountryRegion>${line.tax.taxCountryRegion}</TaxCountryRegion>
            <TaxCode>${line.tax.taxCode}</TaxCode>
            <TaxPercentage>${line.tax.taxPercentage.toFixed(2)}</TaxPercentage>
          </Tax>
          ${line.taxExemptionReason ? `<TaxExemptionReason>${escapeXML(line.taxExemptionReason)}</TaxExemptionReason>` : ''}
          ${line.taxExemptionCode ? `<TaxExemptionCode>${line.taxExemptionCode}</TaxExemptionCode>` : ''}
        </Line>`).join('\n')}
        <DocumentTotals>
          <TaxPayable>${invoice.documentTotals.taxPayable.toFixed(2)}</TaxPayable>
          <NetTotal>${invoice.documentTotals.netTotal.toFixed(2)}</NetTotal>
          <GrossTotal>${invoice.documentTotals.grossTotal.toFixed(2)}</GrossTotal>
${invoice.documentTotals.payment?.map(p => `          <Payment>
            <PaymentMechanism>${p.paymentMechanism}</PaymentMechanism>
            <PaymentAmount>${p.paymentAmount.toFixed(2)}</PaymentAmount>
            <PaymentDate>${p.paymentDate}</PaymentDate>
          </Payment>`).join('\n') || ''}
        </DocumentTotals>
      </Invoice>`;
}

/**
 * Validate SAF-T export data before generation
 */
export function validateSAFTData(options: SAFTExportOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!validateNIF(options.companyInfo.nif)) {
    errors.push('Invalid company NIF');
  }
  
  if (!options.companyInfo.name || options.companyInfo.name.length < 2) {
    errors.push('Company name is required');
  }
  
  if (!options.companyInfo.address.addressDetail) {
    errors.push('Company address is required');
  }
  
  if (!options.companyInfo.address.postalCode || !/^\d{4}-\d{3}$/.test(options.companyInfo.address.postalCode)) {
    errors.push('Valid Portuguese postal code is required (format: XXXX-XXX)');
  }
  
  if (options.fiscalYear < 2000 || options.fiscalYear > new Date().getFullYear() + 1) {
    errors.push('Invalid fiscal year');
  }
  
  if (options.startMonth && (options.startMonth < 1 || options.startMonth > 12)) {
    errors.push('Invalid start month');
  }
  
  if (options.endMonth && (options.endMonth < 1 || options.endMonth > 12)) {
    errors.push('Invalid end month');
  }
  
  if (options.startMonth && options.endMonth && options.startMonth > options.endMonth) {
    errors.push('Start month cannot be after end month');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export type for API
 */
export interface SAFTExportResult {
  success: boolean;
  xml?: string;
  filename?: string;
  errors?: string[];
  invoiceCount?: number;
  totalAmount?: number;
  period?: {
    fiscalYear: number;
    startDate: string;
    endDate: string;
  };
}
