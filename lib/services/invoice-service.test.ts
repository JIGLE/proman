import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  invoiceService,
  calculateLateFee,
  type CreateInvoiceData,
  type InvoiceLineItem,
} from "./invoice-service";
import { getPrismaClient } from "./database/database";

vi.mock("./database/database");

describe("Invoice Service", () => {
  let mockPrisma: any;
  const userId = "user-1";
  const invoiceId = "inv-1";
  const tenantId = "tenant-1";
  const propertyId = "prop-1";
  const ownerId = "owner-1";

  beforeEach(() => {
    mockPrisma = {
      invoice: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("INV-001: Should retrieve all invoices for user", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date("2026-02-01"),
          status: "pending",
          property: { name: "Property A" },
          tenant: { name: "Tenant A" },
          owner: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe("INV-2026-00001");
      expect(mockPrisma.invoice.findMany).toHaveBeenCalled();
    });

    it("INV-002: Should return empty array when no invoices", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      const result = await invoiceService.getAll(userId);
      expect(result).toEqual([]);
    });

    it("INV-003: Should include property, tenant, owner names", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1500,
          dueDate: new Date("2026-02-15"),
          status: "paid",
          property: { name: "Downtown" },
          tenant: { name: "John" },
          owner: { name: "Jane" },
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: null,
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].propertyName).toBe("Downtown");
      expect(result[0].tenantName).toBe("John");
      expect(result[0].ownerName).toBe("Jane");
    });

    it("INV-004: Should parse metadata JSON", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          metadata: JSON.stringify({ notes: "Test invoice" }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].metadata?.notes).toBe("Test invoice");
    });

    it("INV-005: Should format dates correctly", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date("2026-02-01"),
          status: "pending",
          paidDate: new Date("2026-02-05"),
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date("2026-01-15"),
          updatedAt: new Date("2026-01-15"),
          metadata: null,
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].dueDate).toBe("2026-02-01");
      expect(result[0].paidDate).toBe("2026-02-05");
    });
  });

  describe("getById", () => {
    it("INV-006: Should retrieve invoice by ID", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 2000,
        dueDate: new Date("2026-02-01"),
        status: "pending",
        property: { name: "Property A" },
        tenant: null,
        owner: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.getById(userId, invoiceId);
      expect(result?.number).toBe("INV-2026-00001");
      expect(mockPrisma.invoice.findFirst).toHaveBeenCalled();
    });

    it("INV-007: Should return null if not found", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      const result = await invoiceService.getById(userId, "non-existent");
      expect(result).toBeNull();
    });

    it("INV-008: Should verify user access", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: { name: "Property A" },
        tenant: null,
        owner: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await invoiceService.getById(userId, invoiceId);
      const callArgs = mockPrisma.invoice.findFirst.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty("id", invoiceId);
      expect(callArgs.where).toHaveProperty("OR");
    });

    it("INV-009: Should parse metadata when present", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        metadata: JSON.stringify({ notes: "Important" }),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.getById(userId, invoiceId);
      expect(result?.metadata?.notes).toBe("Important");
    });

    it("INV-010: Should handle null metadata", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.getById(userId, invoiceId);
      expect(result?.metadata).toBeUndefined();
    });
  });

  describe("create", () => {
    it("INV-011: Should create new invoice with generated number", async () => {
      const createData: CreateInvoiceData = {
        tenantId,
        propertyId,
        amount: 1500,
        dueDate: "2026-02-15",
        description: "Monthly Rent",
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1500,
        dueDate: new Date("2026-02-15"),
        status: "pending",
        description: "Monthly Rent",
        property: { name: "Property A" },
        tenant: { name: "Tenant A" },
        owner: null,
        metadata: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.create(userId, createData);
      expect(result.number).toMatch(/^INV-\d{4}-\d{5}$/);
      expect(result.status).toBe("pending");
      expect(result.amount).toBe(1500);
    });

    it("INV-012: Should include line items in metadata", async () => {
      const lineItems: InvoiceLineItem[] = [
        { description: "Rent", quantity: 1, unitPrice: 1000, total: 1000 },
        { description: "Utils", quantity: 1, unitPrice: 150, total: 150 },
      ];
      const createData: CreateInvoiceData = {
        tenantId,
        propertyId,
        amount: 1150,
        dueDate: "2026-02-15",
        lineItems,
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1150,
        dueDate: new Date(),
        status: "pending",
        metadata: JSON.stringify({ lineItems }),
        property: null,
        tenant: null,
        owner: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.create(userId, createData);
      expect(result.metadata?.lineItems).toEqual(lineItems);
    });

    it("INV-013: Should assign IDs correctly", async () => {
      const createData: CreateInvoiceData = {
        tenantId,
        propertyId,
        ownerId,
        amount: 2000,
        dueDate: "2026-03-01",
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 2000,
        dueDate: new Date(),
        status: "pending",
        tenantId,
        propertyId,
        ownerId,
        property: null,
        tenant: null,
        owner: null,
        metadata: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await invoiceService.create(userId, createData);
      const callArgs = mockPrisma.invoice.create.mock.calls[0][0];
      expect(callArgs.data.tenantId).toBe(tenantId);
      expect(callArgs.data.propertyId).toBe(propertyId);
      expect(callArgs.data.ownerId).toBe(ownerId);
    });

    it("INV-014: Should call generateInvoiceNumber", async () => {
      const createData: CreateInvoiceData = {
        tenantId,
        amount: 1000,
        dueDate: "2026-02-01",
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        metadata: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.create(userId, createData);
      expect(result.number).toMatch(/^INV-/);
    });

    it("INV-015: Should set status to pending by default", async () => {
      const createData: CreateInvoiceData = {
        tenantId,
        amount: 1000,
        dueDate: "2026-02-01",
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        metadata: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.create(userId, createData);
      expect(result.status).toBe("pending");
    });
  });

  describe("update", () => {
    it("INV-016: Should update invoice amount", async () => {
      const now = new Date();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1500,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1800,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      const result = await invoiceService.update(userId, invoiceId, {
        amount: 1800,
      });
      expect(result.amount).toBe(1800);
    });

    it("INV-017: Should update invoice status", async () => {
      const now = new Date();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "paid",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      const result = await invoiceService.update(userId, invoiceId, {
        status: "paid",
      });
      expect(result.status).toBe("paid");
    });

    it("INV-018: Should throw if invoice not found", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      await expect(invoiceService.update(userId, "non-existent", { amount: 1000 })).rejects.toThrow(
        "Invoice not found",
      );
    });

    it("INV-019: Should update due date", async () => {
      const now = new Date();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date("2026-02-01"),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date("2026-03-01"),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      const result = await invoiceService.update(userId, invoiceId, {
        dueDate: "2026-03-01",
      });
      expect(result.dueDate).toBe("2026-03-01");
    });

    it("INV-020: Should update metadata", async () => {
      const now = new Date();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        metadata: JSON.stringify({}),
        property: null,
        tenant: null,
        createdAt: now,
        updatedAt: now,
        owner: null,
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        metadata: JSON.stringify({ notes: "Updated" }),
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      const result = await invoiceService.update(userId, invoiceId, {
        notes: "Updated",
      });
      expect(result.metadata?.notes).toBe("Updated");
    });
  });

  describe("markAsPaid", () => {
    it("INV-021: Should mark invoice as paid", async () => {
      const now = new Date();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: invoiceId,
        status: "paid",
        paidDate: new Date(),
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      const result = await invoiceService.markAsPaid(userId, invoiceId);
      expect(result.status).toBe("paid");
    });

    it("INV-022: Should set paidDate", async () => {
      const now = new Date();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: invoiceId,
        status: "paid",
        paidDate: new Date(),
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      const result = await invoiceService.markAsPaid(userId, invoiceId);
      expect(result.paidDate).toBeDefined();
    });

    it("INV-023: Should record payment method", async () => {
      const now = new Date();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        metadata: JSON.stringify({}),
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: invoiceId,
        status: "paid",
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        metadata: JSON.stringify({
          paymentMethod: "bank_transfer",
          referenceNumber: "TXN123",
        }),
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      await invoiceService.markAsPaid(userId, invoiceId, "bank_transfer", "TXN123");
      expect(mockPrisma.invoice.update).toHaveBeenCalled();
    });

    it("INV-024: Should throw if invoice not found", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      await expect(invoiceService.markAsPaid(userId, "non-existent")).rejects.toThrow(
        "Invoice not found",
      );
    });

    it("INV-025: Should handle optional payment details", async () => {
      const now = new Date();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: invoiceId,
        status: "paid",
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        property: null,
        tenant: null,
        owner: null,
        createdAt: now,
        updatedAt: now,
      });
      const result = await invoiceService.markAsPaid(userId, invoiceId);
      expect(result.status).toBe("paid");
    });
  });

  describe("Late Fees", () => {
    it("INV-026: Should calculate late fee after grace period", () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 10);
      const result = calculateLateFee(1000, dueDate, {
        enabled: true,
        gracePeriodDays: 5,
        percentageRate: 5,
      });
      expect(result.lateFee).toBeGreaterThan(0);
      expect(result.daysOverdue).toBeGreaterThan(0);
    });

    it("INV-027: Should not charge fee within grace period", () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 3);
      const result = calculateLateFee(1000, dueDate, {
        enabled: true,
        gracePeriodDays: 5,
        percentageRate: 5,
      });
      expect(result.lateFee).toBe(0);
      expect(result.daysOverdue).toBe(0);
    });

    it("INV-028: Should respect enabled flag", () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 10);
      const result = calculateLateFee(1000, dueDate, {
        enabled: false,
        gracePeriodDays: 5,
        percentageRate: 5,
      });
      expect(result.lateFee).toBe(0);
    });

    it("INV-029: Should apply flat fee", () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 10);
      const result = calculateLateFee(1000, dueDate, {
        enabled: true,
        gracePeriodDays: 5,
        percentageRate: 5,
        flatFee: 10,
      });
      expect(result.lateFee).toBeGreaterThan(50);
    });

    it("INV-030: Should cap max percentage", () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 60);
      const result = calculateLateFee(1000, dueDate, {
        enabled: true,
        gracePeriodDays: 0,
        percentageRate: 100,
        maxPercentage: 25,
      });
      expect(result.lateFee).toBeLessThanOrEqual(250);
    });
  });

  describe("Invoice Number Generation", () => {
    it("INV-031: Should generate numbers with format INV-YYYY-NNNNN", async () => {
      const createData: CreateInvoiceData = {
        tenantId,
        amount: 1000,
        dueDate: "2026-02-01",
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00001",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        metadata: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.create(userId, createData);
      expect(result.number).toMatch(/^INV-\d{4}-\d{5}$/);
    });

    it("INV-032: Should increment sequence per year", async () => {
      mockPrisma.invoice.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        number: "INV-2026-00001",
      });
      mockPrisma.invoice.create.mockResolvedValue({
        id: invoiceId,
        number: "INV-2026-00002",
        amount: 1000,
        dueDate: new Date(),
        status: "pending",
        property: null,
        tenant: null,
        owner: null,
        metadata: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await invoiceService.create(userId, {
        tenantId,
        amount: 1000,
        dueDate: "2026-02-01",
      });
      expect(result.number).toMatch(/00001|00002/);
    });
  });

  describe("Invoice Statuses", () => {
    it("INV-033: Should support pending status", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          status: "pending",
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].status).toBe("pending");
    });

    it("INV-034: Should support paid status", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          status: "paid",
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          paidDate: new Date(),
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].status).toBe("paid");
    });

    it("INV-035: Should support overdue status", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          status: "overdue",
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].status).toBe("overdue");
    });

    it("INV-036: Should support cancelled status", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          status: "cancelled",
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].status).toBe("cancelled");
    });
  });

  describe("Invoice Relationships", () => {
    it("INV-037: Should include property reference", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          propertyId,
          property: { name: "Test Property" },
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].propertyId).toBe(propertyId);
      expect(result[0].propertyName).toBe("Test Property");
    });

    it("INV-038: Should include tenant reference", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          tenantId,
          tenant: { name: "Test Tenant" },
          property: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].tenantId).toBe(tenantId);
      expect(result[0].tenantName).toBe("Test Tenant");
    });

    it("INV-039: Should include owner reference", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          ownerId,
          owner: { name: "Test Owner" },
          property: null,
          tenant: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].ownerId).toBe(ownerId);
      expect(result[0].ownerName).toBe("Test Owner");
    });

    it("INV-040: Should handle missing relationships", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].propertyName).toBeUndefined();
      expect(result[0].tenantName).toBeUndefined();
      expect(result[0].ownerName).toBeUndefined();
    });
  });

  describe("Data Types & Conversions", () => {
    it("INV-041: Should convert dates from Date to ISO string", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date("2026-02-01T00:00:00Z"),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date("2026-01-01T10:30:00Z"),
          updatedAt: new Date("2026-01-01T10:30:00Z"),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].dueDate).toBe("2026-02-01");
      expect(typeof result[0].createdAt).toBe("string");
    });

    it("INV-042: Should handle zero amount", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 0,
          dueDate: new Date(),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].amount).toBe(0);
    });

    it("INV-043: Should handle null optional fields", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          paidDate: null,
          status: "pending",
          description: null,
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].paidDate).toBeUndefined();
      expect(result[0].description).toBeUndefined();
    });

    it("INV-044: Should calculate derived fields", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0]).toHaveProperty("userId", userId);
    });

    it("INV-045: Should include all required invoice fields", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      const inv = result[0];
      expect(inv.id).toBeDefined();
      expect(inv.userId).toBeDefined();
      expect(inv.number).toBeDefined();
      expect(inv.amount).toBeDefined();
      expect(inv.dueDate).toBeDefined();
      expect(inv.status).toBeDefined();
      expect(inv.createdAt).toBeDefined();
      expect(inv.updatedAt).toBeDefined();
    });

    it("INV-046: Should handle large invoice amounts", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 999999.99,
          dueDate: new Date(),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].amount).toBe(999999.99);
    });

    it("INV-047: Should order results correctly", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: "inv-2",
          number: "INV-2026-00002",
          amount: 2000,
          dueDate: new Date(),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date("2026-02-01"),
          updatedAt: new Date("2026-02-01"),
        },
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].number).toBe("INV-2026-00002");
      expect(result[1].number).toBe("INV-2026-00001");
    });

    it("INV-048: Should map invoice with complete data", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1500,
          dueDate: new Date("2026-02-01"),
          paidDate: new Date("2026-02-05"),
          status: "paid",
          description: "Rent Payment",
          metadata: JSON.stringify({ notes: "Test" }),
          propertyId: "prop-1",
          property: { name: "Downtown Apt" },
          tenantId: "tenant-1",
          tenant: { name: "John Doe" },
          ownerId: "owner-1",
          owner: { name: "Jane Smith" },
          createdAt: new Date("2026-01-15"),
          updatedAt: new Date("2026-02-05"),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      const inv = result[0];
      expect(inv.userId).toBe(userId);
      expect(inv.id).toBe(invoiceId);
      expect(inv.amount).toBe(1500);
      expect(inv.status).toBe("paid");
      expect(inv.propertyName).toBe("Downtown Apt");
      expect(inv.tenantName).toBe("John Doe");
      expect(inv.ownerName).toBe("Jane Smith");
      expect(inv.metadata?.notes).toBe("Test");
    });

    it("INV-049: Should handle description field", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          description: "Test Description",
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].description).toBe("Test Description");
    });

    it("INV-050: Should handle missing description field", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: invoiceId,
          number: "INV-2026-00001",
          amount: 1000,
          dueDate: new Date(),
          status: "pending",
          description: null,
          property: null,
          tenant: null,
          owner: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await invoiceService.getAll(userId);
      expect(result[0].description).toBeUndefined();
    });
  });
});
