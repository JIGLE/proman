// Portugal-specific payment methods
// Supports: Multibanco, MB WAY, SEPA Direct Debit

import { paymentService, PaymentIntentResult, CreatePaymentIntentParams } from "../payment-service";
import { getPrismaClient } from "@/lib/services/database/database";
import type { PrismaClient } from "@prisma/client";
import { validatePortugueseNIF } from "@/lib/utils/tax-id-validation";
import { createSibsMbwayCharge, isSibsConfigured } from "../providers/sibs-client";

export interface MultibancoDetails {
  entity: string; // 5-digit entity number
  reference: string; // Payment reference
  amount: number; // Amount in cents
  expiresAt: Date; // Expiration date
}

export interface MBWayRequest {
  phoneNumber: string; // Portuguese phone number (9 digits)
  amount: number; // Amount in cents
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
    description?: string,
  ): Promise<PaymentIntentResult> {
    const params: CreatePaymentIntentParams = {
      amount,
      currency: "EUR",
      tenantId,
      invoiceId,
      paymentMethodType: "multibanco",
      description: description || "Rent payment via Multibanco",
      metadata: {
        country: "PT",
        method: "multibanco",
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
    const clean = reference.replace(/\s/g, "");
    if (clean.length !== 9) return reference;
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
  }

  /**
   * Validate Portuguese phone number for MB WAY
   * Must be 9 digits starting with 9
   */
  public validatePortuguesePhone(phone: string): boolean {
    const clean = phone.replace(/\D/g, "");
    return /^9\d{8}$/.test(clean);
  }

  /**
   * Create an MB WAY payment request via the SIBS Payment Gateway.
   *
   * MB WAY is not available through Stripe. When SIBS credentials are present
   * (SIBS_API_KEY / SIBS_CLIENT_ID / SIBS_TERMINAL_ID / SIBS_ENTITY) the charge
   * is issued against the SIBS SPG and a pending transaction is recorded; the
   * `/api/webhooks/sibs` endpoint later confirms the final status. Without
   * credentials it returns a typed "not configured" response.
   *
   * Docs: https://www.sibs.com/en/documentation/
   */
  public async createMBWayPayment(
    request: MBWayRequest & { tenantId?: string; invoiceId?: string },
  ): Promise<MBWayResponse> {
    // Validate phone number
    if (!this.validatePortuguesePhone(request.phoneNumber)) {
      return {
        success: false,
        error: "Invalid Portuguese phone number. Must be 9 digits starting with 9.",
      };
    }

    if (!isSibsConfigured()) {
      return {
        success: false,
        error:
          "MB WAY integration not yet configured. Contact administrator to set up SIBS API credentials.",
      };
    }

    const prisma: PrismaClient = getPrismaClient();

    // Record a pending transaction first so the webhook can reconcile it.
    let transactionId: string | undefined;
    if (request.tenantId) {
      const transaction = await prisma.paymentTransaction.create({
        data: {
          tenantId: request.tenantId,
          invoiceId: request.invoiceId,
          amount: request.amount,
          currency: "EUR",
          status: "pending",
          provider: "mbway",
          description: request.description,
        },
      });
      transactionId = transaction.id;
    }

    const result = await createSibsMbwayCharge({
      phoneNumber: request.phoneNumber,
      amount: request.amount,
      description: request.description,
      merchantTransactionId: transactionId,
    });

    if (!result.success) {
      if (transactionId) {
        await prisma.paymentTransaction.update({
          where: { id: transactionId },
          data: { status: "failed", failedAt: new Date(), failureMessage: result.error },
        });
      }
      return { success: false, error: result.error };
    }

    // Persist the SIBS reference for webhook reconciliation.
    if (transactionId) {
      await prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          providerTransactionId: result.requestId,
          mbwayRequestId: result.requestId,
          status: result.status ?? "requires_action",
        },
      });
    }

    return {
      success: true,
      requestId: result.requestId,
      status: result.providerStatus ?? "requires_action",
    };
  }

  /**
   * Create SEPA Direct Debit mandate for Portugal
   */
  public async createSEPAMandate(
    tenantId: string,
    iban: string,
    accountHolderName: string,
  ): Promise<{ success: boolean; mandateId?: string; error?: string }> {
    const prisma: PrismaClient = getPrismaClient();

    try {
      // Validate IBAN format for Portugal (starts with PT50)
      if (!this.validatePortugueseIBAN(iban)) {
        return { success: false, error: "Invalid Portuguese IBAN. Must start with PT." };
      }

      const stripe = paymentService.getStripeClient();
      const customerId = await paymentService.getOrCreateStripeCustomer(tenantId);

      // Create a SetupIntent for SEPA Direct Debit
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["sepa_debit"],
        metadata: {
          tenantId,
          country: "PT",
        },
      });

      // Store payment method reference
      await prisma.paymentMethod.create({
        data: {
          tenantId,
          type: "sepa_debit",
          provider: "stripe",
          stripeCustomerId: customerId,
          country: "PT",
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
      const message = error instanceof Error ? error.message : "Failed to create SEPA mandate";
      return { success: false, error: message };
    }
  }

  /**
   * Validate Portuguese IBAN
   * Format: PT50 XXXX XXXX XXXX XXXX XXXX X (25 characters)
   */
  public validatePortugueseIBAN(iban: string): boolean {
    const clean = iban.replace(/\s/g, "").toUpperCase();
    return /^PT50\d{21}$/.test(clean);
  }

  /**
   * Mask IBAN for display (show first 4 and last 4 characters)
   */
  public maskIBAN(iban: string): string {
    const clean = iban.replace(/\s/g, "").toUpperCase();
    if (clean.length < 8) return clean;
    return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
  }

  /**
   * Get NIF (Portuguese tax number) validation
   * Delegates to shared validation module
   */
  public validateNIF(nif: string): boolean {
    return validatePortugueseNIF(nif);
  }

  /**
   * Format amount in Portuguese format (€ 1.234,56)
   */
  public formatAmountPT(amountCents: number): string {
    const euros = amountCents / 100;
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(euros);
  }
}

// Export singleton instance
export const portugalPaymentService = PortugalPaymentService.getInstance();
