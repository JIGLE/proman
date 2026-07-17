import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReceiptFindFirst = vi.fn();
const mockReceiptUpdate = vi.fn();
const mockRentReceiptFindFirst = vi.fn();
const mockDocumentFindFirst = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockPropertyFindUnique = vi.fn();

vi.mock("@/lib/services/database/database", () => ({
  getPrismaClient: () => ({
    receipt: { findFirst: mockReceiptFindFirst, update: mockReceiptUpdate },
    rentReceipt: { findFirst: mockRentReceiptFindFirst },
    document: { findFirst: mockDocumentFindFirst },
    tenant: { findUnique: mockTenantFindUnique },
    property: { findUnique: mockPropertyFindUnique },
  }),
}));

const mockLogAudit = vi.fn();
vi.mock("@/lib/services/audit-log", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

const mockReverseAllocations = vi.fn().mockResolvedValue(0);
vi.mock("@/lib/services/allocation/service", () => ({
  reverseAllocationsForReceipt: (...args: unknown[]) => mockReverseAllocations(...args),
}));

const mockGenerateFromHTML = vi
  .fn()
  .mockResolvedValue({
    buffer: Buffer.from("pdf"),
    mimeType: "application/pdf",
    fileName: "r.pdf",
  });
vi.mock("@/lib/services/pdf-generator", () => ({
  pdfGenerator: { generateFromHTML: (...args: unknown[]) => mockGenerateFromHTML(...args) },
}));

const mockDocumentCreate = vi.fn().mockResolvedValue({ id: "doc_1" });
vi.mock("@/lib/services/document-service", () => ({
  documentService: { create: (...args: unknown[]) => mockDocumentCreate(...args) },
}));

const mockConnectorSubmit = vi.fn();
const mockConnectorPoll = vi.fn();
vi.mock("@/lib/tax/connectors/pt-at", () => ({
  ptAtConnector: {
    submit: (...args: unknown[]) => mockConnectorSubmit(...args),
    poll: (...args: unknown[]) => mockConnectorPoll(...args),
  },
}));

import { transitionReceipt } from "./service";

const baseReceipt = {
  id: "receipt_1",
  userId: "user_1",
  tenantId: "tenant_1",
  propertyId: "property_1",
  amount: 850,
  date: new Date("2026-07-01T00:00:00.000Z"),
  referenceMonth: "2026-07",
  lifecycle: "draft",
};

describe("transitionReceipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReceiptFindFirst.mockResolvedValue({ ...baseReceipt });
    mockDocumentFindFirst.mockResolvedValue(null);
    mockTenantFindUnique.mockResolvedValue({ name: "Maria Silva" });
    mockPropertyFindUnique.mockResolvedValue({ name: "Rua Azul 12", address: "Lisboa" });
    mockReverseAllocations.mockResolvedValue(0);
  });

  it("throws when the receipt does not belong to the user", async () => {
    mockReceiptFindFirst.mockResolvedValue(null);
    await expect(transitionReceipt("user_1", "receipt_1", "review")).rejects.toThrow(
      "Receipt not found",
    );
  });

  it("rejects a disallowed transition without mutating anything", async () => {
    await expect(transitionReceipt("user_1", "receipt_1", "accepted")).rejects.toThrow(
      /Cannot move/,
    );
    expect(mockReceiptUpdate).not.toHaveBeenCalled();
  });

  it("moves draft to review with a plain audit entry and no archive", async () => {
    const outcome = await transitionReceipt("user_1", "receipt_1", "review");
    expect(outcome).toEqual({ lifecycle: "review", archived: false, connector: undefined });
    expect(mockReceiptUpdate).toHaveBeenCalledWith({
      where: { id: "receipt_1" },
      data: { lifecycle: "review" },
    });
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TRANSITION_RECEIPT_LIFECYCLE" }),
    );
  });

  it("archives on emit and logs EMIT_RECEIPT + ARCHIVE_RECEIPT", async () => {
    const outcome = await transitionReceipt("user_1", "receipt_1", "emitted");
    expect(outcome.archived).toBe(true);
    expect(mockGenerateFromHTML).toHaveBeenCalledTimes(1);
    expect(mockDocumentCreate).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ type: "receipt", description: "situs-receipt-archive:receipt_1" }),
    );
    const actions = mockLogAudit.mock.calls.map((call) => call[0].action);
    expect(actions).toContain("ARCHIVE_RECEIPT");
    expect(actions).toContain("EMIT_RECEIPT");
  });

  it("does not re-archive when a document for this receipt already exists", async () => {
    mockDocumentFindFirst.mockResolvedValue({ id: "doc_existing" });
    const outcome = await transitionReceipt("user_1", "receipt_1", "emitted");
    expect(outcome.archived).toBe(false);
    expect(mockGenerateFromHTML).not.toHaveBeenCalled();
    expect(mockLogAudit.mock.calls.map((c) => c[0].action)).not.toContain("ARCHIVE_RECEIPT");
  });

  it("submitting requires a linked PT rent receipt filing", async () => {
    mockReceiptFindFirst.mockResolvedValue({ ...baseReceipt, lifecycle: "emitted" });
    mockRentReceiptFindFirst.mockResolvedValue(null);
    await expect(transitionReceipt("user_1", "receipt_1", "submitted")).rejects.toThrow(
      /Link a PT rent receipt/,
    );
    expect(mockConnectorSubmit).not.toHaveBeenCalled();
  });

  it("submits via the PT connector when a filing is linked", async () => {
    mockReceiptFindFirst.mockResolvedValue({ ...baseReceipt, lifecycle: "emitted" });
    mockRentReceiptFindFirst.mockResolvedValue({ id: "rr_1" });
    mockConnectorSubmit.mockResolvedValue({ status: "success", responseCode: "202" });
    const outcome = await transitionReceipt("user_1", "receipt_1", "submitted");
    expect(mockConnectorSubmit).toHaveBeenCalledWith("rr_1");
    expect(outcome.connector).toEqual({ status: "success", responseCode: "202" });
  });

  it("surfaces a connector error as a thrown error and does not update lifecycle", async () => {
    mockReceiptFindFirst.mockResolvedValue({ ...baseReceipt, lifecycle: "emitted" });
    mockRentReceiptFindFirst.mockResolvedValue({ id: "rr_1" });
    mockConnectorSubmit.mockResolvedValue({ status: "error", responseBody: "Invalid NIF" });
    await expect(transitionReceipt("user_1", "receipt_1", "submitted")).rejects.toThrow(
      "Invalid NIF",
    );
    expect(mockReceiptUpdate).not.toHaveBeenCalled();
  });

  it("voiding reverses live allocations and logs VOID_RECEIPT", async () => {
    mockReceiptFindFirst.mockResolvedValue({ ...baseReceipt, lifecycle: "draft" });
    await transitionReceipt("user_1", "receipt_1", "voided", { voidReason: "duplicate payment" });
    expect(mockReverseAllocations).toHaveBeenCalledWith("receipt_1", "duplicate payment");
    expect(mockLogAudit.mock.calls.map((c) => c[0].action)).toContain("VOID_RECEIPT");
  });
});
