import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env utilities before importing payment service
vi.mock("@/lib/utils/env", () => ({
  getSecret: vi.fn((key: string) => {
    if (key === "STRIPE_SECRET_KEY") return "sk_test_mock_key";
    if (key === "STRIPE_WEBHOOK_SECRET") return "whsec_mock_secret";
    return undefined;
  }),
  isEnabled: vi.fn((key: string) => {
    if (key === "ENABLE_STRIPE") return true;
    return false;
  }),
}));

// Mock Stripe
const mockStripeCreate = vi.fn();
const mockCustomerCreate = vi.fn();

vi.mock("stripe", () => ({
  default: class MockStripe {
    paymentIntents = { create: mockStripeCreate };
    customers = { create: mockCustomerCreate };
  },
}));

// Mock Prisma
const mockPrismaClient = {
  tenant: {
    findUnique: vi.fn(),
  },
  paymentTransaction: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  invoice: {
    update: vi.fn(),
  },
};

vi.mock("@/lib/services/database/database", () => ({
  getPrismaClient: vi.fn(() => mockPrismaClient),
}));

// Import after mocks
import { PaymentService } from "./payment-service";

describe("PaymentService", () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for each test
    (PaymentService as any).instance = undefined;
    service = PaymentService.getInstance();
  });

  describe("getInstance", () => {
    it("should return a singleton instance", () => {
      const instance1 = PaymentService.getInstance();
      const instance2 = PaymentService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("isReady", () => {
    it("should return true when Stripe is configured", () => {
      expect(service.isReady()).toBe(true);
    });
  });

  describe("getAvailablePaymentMethods", () => {
    it("should return Portugal payment methods for PT", () => {
      const methods = service.getAvailablePaymentMethods("PT");
      expect(methods).toEqual(["card", "sepa_debit", "multibanco", "mbway", "bank_transfer"]);
    });

    it("should return Spain payment methods for ES", () => {
      const methods = service.getAvailablePaymentMethods("ES");
      expect(methods).toEqual(["card", "sepa_debit", "bank_transfer"]);
    });

    it("should return EU fallback for unknown countries", () => {
      const methods = service.getAvailablePaymentMethods("DE");
      expect(methods).toEqual(["card", "sepa_debit", "bank_transfer"]);
    });

    it("should be case insensitive", () => {
      const methods = service.getAvailablePaymentMethods("pt");
      expect(methods).toEqual(["card", "sepa_debit", "multibanco", "mbway", "bank_transfer"]);
    });
  });

  describe("getPaymentMethodInfo", () => {
    it("should return info for card payment method", () => {
      const info = service.getPaymentMethodInfo("card");
      expect(info.name).toBe("Credit/Debit Card");
      expect(info.icon).toBe("credit-card");
    });

    it("should return info for SEPA debit", () => {
      const info = service.getPaymentMethodInfo("sepa_debit");
      expect(info.name).toBe("SEPA Direct Debit");
    });

    it("should return info for Multibanco", () => {
      const info = service.getPaymentMethodInfo("multibanco");
      expect(info.name).toBe("Multibanco");
      expect(info.description).toContain("Portugal");
    });

    it("should return info for MB WAY", () => {
      const info = service.getPaymentMethodInfo("mbway");
      expect(info.name).toBe("MB WAY");
      expect(info.description).toContain("Portugal");
    });

    it("should return info for bank transfer", () => {
      const info = service.getPaymentMethodInfo("bank_transfer");
      expect(info.name).toBe("Bank Transfer");
    });

    it("should return info for cash", () => {
      const info = service.getPaymentMethodInfo("cash");
      expect(info.name).toBe("Cash");
    });

    it("should return other for unknown methods", () => {
      const info = service.getPaymentMethodInfo("unknown" as any);
      expect(info.name).toBe("Other");
    });
  });

  describe("getOrCreateStripeCustomer", () => {
    it("should return existing Stripe customer ID if tenant already has one", async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        email: "tenant@test.com",
        name: "Test Tenant",
        phone: "+351912345678",
        paymentMethods: [{ stripeCustomerId: "cus_existing123" }],
      });

      const customerId = await service.getOrCreateStripeCustomer("tenant-1");
      expect(customerId).toBe("cus_existing123");
      expect(mockCustomerCreate).not.toHaveBeenCalled();
    });

    it("should create new Stripe customer if tenant has none", async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        email: "tenant@test.com",
        name: "Test Tenant",
        phone: "+351912345678",
        paymentMethods: [],
      });
      mockCustomerCreate.mockResolvedValue({ id: "cus_new123" });

      const customerId = await service.getOrCreateStripeCustomer("tenant-1");
      expect(customerId).toBe("cus_new123");
      expect(mockCustomerCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "tenant@test.com",
          name: "Test Tenant",
          metadata: expect.objectContaining({ tenantId: "tenant-1" }),
        }),
      );
    });

    it("should throw if tenant not found", async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getOrCreateStripeCustomer("nonexistent")).rejects.toThrow(
        "Tenant not found",
      );
    });
  });

  describe("createPaymentIntent", () => {
    const baseParams = {
      amount: 95000, // €950.00 in cents
      currency: "EUR",
      tenantId: "tenant-1",
      invoiceId: "invoice-1",
      paymentMethodType: "card" as const,
      description: "Rent payment",
    };

    beforeEach(() => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        email: "tenant@test.com",
        name: "Test Tenant",
        phone: "+351912345678",
        paymentMethods: [{ stripeCustomerId: "cus_existing123" }],
      });
      mockStripeCreate.mockResolvedValue({
        id: "pi_test123",
        client_secret: "pi_test123_secret_abc",
        status: "requires_payment_method",
      });
      mockPrismaClient.paymentTransaction.create.mockResolvedValue({
        id: "txn-1",
        tenantId: "tenant-1",
        amount: 95000,
        status: "pending",
      });
    });

    it("should create card payment intent successfully", async () => {
      const result = await service.createPaymentIntent(baseParams);

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe("pi_test123");
      expect(result.clientSecret).toBe("pi_test123_secret_abc");
      expect(result.transactionId).toBe("txn-1");
    });

    it("should create SEPA debit payment intent", async () => {
      const result = await service.createPaymentIntent({
        ...baseParams,
        paymentMethodType: "sepa_debit",
      });

      expect(result.success).toBe(true);
      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ["sepa_debit"],
        }),
      );
    });

    it("should create Multibanco payment intent", async () => {
      mockStripeCreate.mockResolvedValue({
        id: "pi_mb_test",
        client_secret: "pi_mb_test_secret",
        status: "requires_action",
        next_action: {
          multibanco_display_details: {
            entity: "12345",
            reference: "123 456 789",
            expires_at: "1714000000",
          },
        },
      });

      const result = await service.createPaymentIntent({
        ...baseParams,
        paymentMethodType: "multibanco",
      });

      expect(result.success).toBe(true);
      expect(result.multibancoEntity).toBe("12345");
      expect(result.multibancoReference).toBe("123 456 789");
    });

    it("should handle MB WAY payment (returns pending with SIBS note)", async () => {
      const result = await service.createPaymentIntent({
        ...baseParams,
        paymentMethodType: "mbway",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("requires_action");
      expect(result.transactionId).toBeDefined();
    });

    it("should handle bank transfer payment", async () => {
      const result = await service.createPaymentIntent({
        ...baseParams,
        paymentMethodType: "bank_transfer",
      });

      expect(result.success).toBe(true);
      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ["customer_balance"],
        }),
      );
    });

    it("should return error for unsupported payment method", async () => {
      const result = await service.createPaymentIntent({
        ...baseParams,
        paymentMethodType: "bitcoin" as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported payment method");
    });

    it("should return error when tenant not found", async () => {
      mockPrismaClient.tenant.findUnique.mockResolvedValue(null);

      const result = await service.createPaymentIntent(baseParams);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Tenant not found");
    });

    it("should handle Stripe API errors gracefully", async () => {
      mockStripeCreate.mockRejectedValue(new Error("Stripe API error"));

      const result = await service.createPaymentIntent(baseParams);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Stripe API error");
    });
  });

  describe("processStripeWebhook", () => {
    it("should handle payment_intent.succeeded event", async () => {
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue({
        id: "txn-1",
        invoiceId: "inv-1",
        amount: 95000,
      });
      mockPrismaClient.paymentTransaction.update.mockResolvedValue({});
      mockPrismaClient.invoice.update.mockResolvedValue({});

      const result = await service.processStripeWebhook({
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test123",
            latest_charge: "ch_test123",
          },
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("succeeded");
      expect(mockPrismaClient.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv-1" },
          data: expect.objectContaining({ status: "paid" }),
        }),
      );
    });

    it("should handle payment_intent.payment_failed event", async () => {
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue({
        id: "txn-1",
      });
      mockPrismaClient.paymentTransaction.update.mockResolvedValue({});

      const result = await service.processStripeWebhook({
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_failed",
            last_payment_error: {
              code: "card_declined",
              message: "Your card was declined",
            },
          },
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("failed");
    });

    it("should handle payment_intent.canceled event", async () => {
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue({
        id: "txn-1",
      });
      mockPrismaClient.paymentTransaction.update.mockResolvedValue({});

      const result = await service.processStripeWebhook({
        type: "payment_intent.canceled",
        data: { object: { id: "pi_canceled" } },
      } as any);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("cancelled");
    });

    it("should handle charge.refunded event (full refund)", async () => {
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue({
        id: "txn-1",
        amount: 95000,
      });
      mockPrismaClient.paymentTransaction.update.mockResolvedValue({});

      const result = await service.processStripeWebhook({
        type: "charge.refunded",
        data: {
          object: {
            id: "ch_refunded",
            amount_refunded: 95000,
          },
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("refunded");
    });

    it("should handle charge.refunded event (partial refund)", async () => {
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue({
        id: "txn-1",
        amount: 95000,
      });
      mockPrismaClient.paymentTransaction.update.mockResolvedValue({});

      const result = await service.processStripeWebhook({
        type: "charge.refunded",
        data: {
          object: {
            id: "ch_refunded",
            amount_refunded: 50000,
          },
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("partially_refunded");
    });

    it("should return error when transaction not found", async () => {
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue(null);

      const result = await service.processStripeWebhook({
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_unknown" } },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Transaction not found");
    });

    it("should ignore unhandled event types", async () => {
      const result = await service.processStripeWebhook({
        type: "customer.created",
        data: { object: {} },
      } as any);

      expect(result.success).toBe(true);
    });
  });

  describe("getTenantTransactions", () => {
    it("should return transactions for a tenant", async () => {
      const mockTransactions = [
        { id: "txn-1", amount: 95000, status: "succeeded" },
        { id: "txn-2", amount: 85000, status: "pending" },
      ];
      mockPrismaClient.paymentTransaction.findMany.mockResolvedValue(mockTransactions);

      const transactions = await service.getTenantTransactions("tenant-1");
      expect(transactions).toHaveLength(2);
      expect(mockPrismaClient.paymentTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: "tenant-1" },
          orderBy: { createdAt: "desc" },
          take: 20,
          skip: 0,
        }),
      );
    });

    it("should support pagination options", async () => {
      mockPrismaClient.paymentTransaction.findMany.mockResolvedValue([]);

      await service.getTenantTransactions("tenant-1", {
        limit: 10,
        offset: 20,
      });

      expect(mockPrismaClient.paymentTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("should support status filtering", async () => {
      mockPrismaClient.paymentTransaction.findMany.mockResolvedValue([]);

      await service.getTenantTransactions("tenant-1", {
        status: "succeeded",
      });

      expect(mockPrismaClient.paymentTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: "tenant-1", status: "succeeded" },
        }),
      );
    });
  });

  describe("getTransaction", () => {
    it("should return transaction by ID", async () => {
      const mockTxn = { id: "txn-1", amount: 95000 };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(mockTxn);

      const txn = await service.getTransaction("txn-1");
      expect(txn).toEqual(mockTxn);
    });

    it("should return null for non-existent transaction", async () => {
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(null);

      const txn = await service.getTransaction("nonexistent");
      expect(txn).toBeNull();
    });
  });
});
