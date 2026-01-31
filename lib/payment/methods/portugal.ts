// Portugal-specific payment methods
// Supports: Multibanco, MB WAY, SEPA Direct Debit

import { paymentService, PaymentIntentResult, CreatePaymentIntentParams } from '../payment-service';
import { getPrismaClient } from '@/lib/database';
import type { PrismaClient } from '@prisma/client';

export interface MultibancoDetails {
  entity: string;       // 5-digit entity number
  reference: string;    // Payment reference
  amount: number;       // Amount in cents
  expiresAt: Date;      // Expiration date
}

export interface MBWayRequest {
  phoneNumber: string;  // Portuguese phone number (9 digits)
  amount: number;       // Amount in cents
  description?: string;
}

export interface MBWayResponse {
  success: boolean;
  requestId?: string;
  status?: string;
  error?: string;
}

export class PortugalPaymentService {
  private static instance: PortugalPaymentService;

  private constructor() {}

  public static getInstance(): PortugalPaymentService {
    if (!PortugalPaymentService.instance) {
      PortugalPaymentService.instance = new PortugalPaymentService();
    }
    return PortugalPaymentService.instance;
  }

  /**
   * Create a Multibanco payment reference via Stripe
   * Returns entity/reference that tenant can use to pay at ATM or home banking
   */
  public async createMultibancoPayment(
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
      paymentMethodType: 'multibanco',
      description: description || 'Rent payment via Multibanco',
      metadata: {
        country: 'PT',
        method: 'multibanco',
      },
    };

    const result = await paymentService.createPaymentIntent(params);
    
    return result;
  }

  /**
   * Parse Multibanco details from a transaction
   */
  public async getMultibancoDetails(transactionId: string): Promise<MultibancoDetails | null> {
    const prisma: PrismaClient = getPrismaClient();
    
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || !transaction.multibancoEntity || !transaction.multibancoReference) {
      return null;
    }

    return {
      entity: transaction.multibancoEntity,
      reference: transaction.multibancoReference,
      amount: transaction.amount,
      expiresAt: transaction.multibancoExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    };
  }

  /**
   * Format Multibanco reference for display
   * Reference is typically 9 digits, displayed as XXX XXX XXX
   */
  public formatMultibancoReference(reference: string): string {
    const clean = reference.replace(/\s/g, '');
    if (clean.length !== 9) return reference;
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
  }

  /**
   * Validate Portuguese phone number for MB WAY
   * Must be 9 digits starting with 9
   */
  public validatePortuguesePhone(phone: string): boolean {
    const clean = phone.replace(/\D/g, '');
    return /^9\d{8}$/.test(clean);
  }

  /**
   * Create MB WAY payment request
   * Note: This requires SIBS API integration (not available via Stripe)
   * Currently returns a placeholder - full implementation requires SIBS partnership
   */
  public async createMBWayPayment(request: MBWayRequest): Promise<MBWayResponse> {
    // Validate phone number
    if (!this.validatePortuguesePhone(request.phoneNumber)) {
      return {
        success: false,
        error: 'Invalid Portuguese phone number. Must be 9 digits starting with 9.',
      };
    }

    // TODO: Implement SIBS MB WAY API integration
    // SIBS API documentation: https://www.sibs.com/en/documentation/
    // This requires:
    // 1. SIBS merchant account
    // 2. API credentials (client_id, client_secret)
    // 3. Webhook endpoint for payment confirmation
    
    console.warn('MB WAY integration requires SIBS API - returning placeholder response');

    return {
      success: false,
      error: 'MB WAY integration not yet configured. Contact administrator to set up SIBS API credentials.',
    };
  }

  /**
   * Create SEPA Direct Debit mandate for Portugal
   */
  public async createSEPAMandate(
    tenantId: string,
    iban: string,
    accountHolderName: string
  ): Promise<{ success: boolean; mandateId?: string; error?: string }> {
    const prisma: PrismaClient = getPrismaClient();
    
    try {
      // Validate IBAN format for Portugal (starts with PT50)
      if (!this.validatePortugueseIBAN(iban)) {
        return { success: false, error: 'Invalid Portuguese IBAN. Must start with PT.' };
      }

      const stripe = paymentService.getStripeClient();
      const customerId = await paymentService.getOrCreateStripeCustomer(tenantId);

      // Create a SetupIntent for SEPA Direct Debit
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['sepa_debit'],
        metadata: {
          tenantId,
          country: 'PT',
        },
      });

      // Store payment method reference
      await prisma.paymentMethod.create({
        data: {
          tenantId,
          type: 'sepa_debit',
          provider: 'stripe',
          stripeCustomerId: customerId,
          country: 'PT',
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
   * Validate Portuguese IBAN
   * Format: PT50 XXXX XXXX XXXX XXXX XXXX X (25 characters)
   */
  public validatePortugueseIBAN(iban: string): boolean {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    return /^PT50\d{21}$/.test(clean);
  }

  /**
   * Mask IBAN for display (show first 4 and last 4 characters)
   */
  public maskIBAN(iban: string): string {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (clean.length < 8) return clean;
    return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
  }

  /**
   * Get NIF (Portuguese tax number) validation
   * Used for tax compliance/invoicing
   */
  public validateNIF(nif: string): boolean {
    const clean = nif.replace(/\D/g, '');
    
    if (clean.length !== 9) return false;
    
    // First digit must be 1, 2, 3, 5, 6, 7, 8, or 9
    const firstDigit = parseInt(clean[0]);
    if (![1, 2, 3, 5, 6, 7, 8, 9].includes(firstDigit)) return false;
    
    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(clean[i]) * (9 - i);
    }
    
    const checkDigit = 11 - (sum % 11);
    const expectedCheckDigit = checkDigit >= 10 ? 0 : checkDigit;
    
    return parseInt(clean[8]) === expectedCheckDigit;
  }

  /**
   * Format amount in Portuguese format (€ 1.234,56)
   */
  public formatAmountPT(amountCents: number): string {
    const euros = amountCents / 100;
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(euros);
  }
}

// Export singleton instance
export const portugalPaymentService = PortugalPaymentService.getInstance();
