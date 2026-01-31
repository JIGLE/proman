// Spain-specific payment methods
// Supports: SEPA Direct Debit, Bank Transfer, Card
// Bizum integration placeholder for future implementation

import { paymentService, PaymentIntentResult, CreatePaymentIntentParams } from '../payment-service';
import { getPrismaClient } from '@/lib/database';
import type { PrismaClient, PaymentMethod } from '@prisma/client';

export interface BizumRequest {
  phoneNumber: string;  // Spanish phone number
  amount: number;       // Amount in cents
  description?: string;
}

export interface BizumResponse {
  success: boolean;
  requestId?: string;
  status?: string;
  error?: string;
}

export class SpainPaymentService {
  private static instance: SpainPaymentService;

  private constructor() {}

  public static getInstance(): SpainPaymentService {
    if (!SpainPaymentService.instance) {
      SpainPaymentService.instance = new SpainPaymentService();
    }
    return SpainPaymentService.instance;
  }

  /**
   * Create SEPA Direct Debit mandate for Spain
   */
  public async createSEPAMandate(
    tenantId: string,
    iban: string,
    accountHolderName: string
  ): Promise<{ success: boolean; mandateId?: string; error?: string }> {
    const prisma: PrismaClient = getPrismaClient();
    
    try {
      // Validate IBAN format for Spain (starts with ES)
      if (!this.validateSpanishIBAN(iban)) {
        return { success: false, error: 'Invalid Spanish IBAN. Must start with ES.' };
      }

      const stripe = paymentService.getStripeClient();
      const customerId = await paymentService.getOrCreateStripeCustomer(tenantId);

      // Create a SetupIntent for SEPA Direct Debit
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['sepa_debit'],
        metadata: {
          tenantId,
          country: 'ES',
        },
      });

      // Store payment method reference
      await prisma.paymentMethod.create({
        data: {
          tenantId,
          type: 'sepa_debit',
          provider: 'stripe',
          stripeCustomerId: customerId,
          country: 'ES',
          iban: this.maskIBAN(iban),
          ibanLast4: iban.slice(-4),
          accountHolder: accountHolderName,
          isActive: true,
        },
      });

      return {
        success: true,
        mandateId: setupIntent.id,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create SEPA mandate';
      return { success: false, error: message };
    }
  }

  /**
   * Create bank transfer payment for Spain
   */
  public async createBankTransferPayment(
    tenantId: string,
    amount: number, // in cents
    invoiceId?: string,
    description?: string
  ): Promise<PaymentIntentResult> {
    const params: CreatePaymentIntentParams = {
      amount,
      currency: 'EUR',
      tenantId,
      invoiceId,
      paymentMethodType: 'bank_transfer',
      description: description || 'Rent payment via bank transfer',
      metadata: {
        country: 'ES',
        method: 'bank_transfer',
      },
    };

    return paymentService.createPaymentIntent(params);
  }

  /**
   * Create card payment for Spain
   */
  public async createCardPayment(
    tenantId: string,
    amount: number, // in cents
    invoiceId?: string,
    description?: string
  ): Promise<PaymentIntentResult> {
    const params: CreatePaymentIntentParams = {
      amount,
      currency: 'EUR',
      tenantId,
      invoiceId,
      paymentMethodType: 'card',
      description: description || 'Rent payment via card',
      metadata: {
        country: 'ES',
        method: 'card',
      },
    };

    return paymentService.createPaymentIntent(params);
  }

  /**
   * Bizum payment request (placeholder for future integration)
   * 
   * Bizum is Spain's popular mobile payment system.
   * Integration requires partnership with participating Spanish banks.
   * 
   * Reference: https://bizum.es/en/
   */
  public async createBizumPayment(request: BizumRequest): Promise<BizumResponse> {
    // Validate Spanish phone number
    if (!this.validateSpanishPhone(request.phoneNumber)) {
      return {
        success: false,
        error: 'Invalid Spanish phone number. Must be 9 digits starting with 6 or 7.',
      };
    }

    // TODO: Implement Bizum API integration
    // Bizum integration requires:
    // 1. Partnership agreement with Spanish bank consortium
    // 2. API credentials and merchant account
    // 3. Webhook endpoint for payment confirmation
    // 4. Compliance with Spanish banking regulations
    
    console.warn('Bizum integration requires bank partnership - returning placeholder response');

    return {
      success: false,
      error: 'Bizum integration not yet available. This feature requires partnership with Spanish banks.',
    };
  }

  /**
   * Validate Spanish IBAN
   * Format: ESXX XXXX XXXX XXXX XXXX XXXX (24 characters)
   */
  public validateSpanishIBAN(iban: string): boolean {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    return /^ES\d{22}$/.test(clean);
  }

  /**
   * Validate Spanish phone number
   * Mobile numbers start with 6 or 7
   */
  public validateSpanishPhone(phone: string): boolean {
    const clean = phone.replace(/\D/g, '');
    // Spanish mobile numbers: 9 digits starting with 6 or 7
    return /^[67]\d{8}$/.test(clean);
  }

  /**
   * Mask IBAN for display
   */
  public maskIBAN(iban: string): string {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (clean.length < 8) return clean;
    return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
  }

  /**
   * Validate Spanish NIF/NIE (tax identification)
   * NIF: 8 digits + letter (Spanish citizens)
   * NIE: Letter + 7 digits + letter (foreigners)
   */
  public validateNIF(nif: string): boolean {
    const clean = nif.replace(/\s|-/g, '').toUpperCase();
    
    // NIF pattern: 8 digits + control letter
    const nifPattern = /^(\d{8})([A-Z])$/;
    // NIE pattern: X/Y/Z + 7 digits + control letter
    const niePattern = /^([XYZ])(\d{7})([A-Z])$/;
    
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    
    if (nifPattern.test(clean)) {
      const [, number, letter] = clean.match(nifPattern)!;
      const expectedLetter = letters[parseInt(number) % 23];
      return letter === expectedLetter;
    }
    
    if (niePattern.test(clean)) {
      const [, prefix, number, letter] = clean.match(niePattern)!;
      const prefixMap: Record<string, string> = { X: '0', Y: '1', Z: '2' };
      const fullNumber = prefixMap[prefix] + number;
      const expectedLetter = letters[parseInt(fullNumber) % 23];
      return letter === expectedLetter;
    }
    
    return false;
  }

  /**
   * Format amount in Spanish format (1.234,56 €)
   */
  public formatAmountES(amountCents: number): string {
    const euros = amountCents / 100;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(euros);
  }

  /**
   * Get bank name from Spanish IBAN
   * First 4 digits after country code identify the bank
   */
  public getBankFromIBAN(iban: string): string {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (!this.validateSpanishIBAN(clean)) return 'Unknown';
    
    const bankCode = clean.slice(4, 8);
    
    // Common Spanish bank codes
    const banks: Record<string, string> = {
      '0049': 'Santander',
      '0019': 'Deutsche Bank',
      '0030': 'Banco Español de Crédito',
      '0057': 'Banco Bilbao Vizcaya',
      '0073': 'Open Bank',
      '0075': 'Banco Popular Español',
      '0081': 'Banco de Sabadell',
      '0082': 'Banca March',
      '0128': 'Bankinter',
      '0131': 'Banco Espirito Santo',
      '0138': 'Bankoa',
      '0182': 'BBVA',
      '0186': 'Banco Mediolanum',
      '0487': 'Banco Mare Nostrum',
      '2038': 'Bankia',
      '2080': 'Abanca',
      '2085': 'Ibercaja',
      '2095': 'Kutxabank',
      '2100': 'CaixaBank',
      '3058': 'Cajamar',
    };
    
    return banks[bankCode] || 'Unknown Bank';
  }
}

// Export singleton instance
export const spainPaymentService = SpainPaymentService.getInstance();
