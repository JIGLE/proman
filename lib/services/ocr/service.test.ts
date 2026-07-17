import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDocumentFindUnique = vi.fn();
const mockExtractionUpsert = vi.fn();
const mockExtractionFindFirst = vi.fn();
const mockExtractionUpdate = vi.fn();
const mockDocumentUpdate = vi.fn();
const mockTransaction = vi.fn(async (ops: unknown[]) => Promise.all(ops));

vi.mock("@/lib/services/database/database", () => ({
  getPrismaClient: () => ({
    document: { findUnique: mockDocumentFindUnique, update: mockDocumentUpdate },
    documentExtraction: {
      upsert: mockExtractionUpsert,
      findFirst: mockExtractionFindFirst,
      update: mockExtractionUpdate,
    },
    $transaction: mockTransaction,
  }),
}));

const mockLogAudit = vi.fn();
vi.mock("@/lib/services/audit-log", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

import { classifyAndPersist, reviewExtraction } from "./service";

describe("classifyAndPersist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no-ops when the document does not exist", async () => {
    mockDocumentFindUnique.mockResolvedValue(null);
    await classifyAndPersist("doc_missing");
    expect(mockExtractionUpsert).not.toHaveBeenCalled();
  });

  it("classifies and upserts an extraction, then audits", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: "doc_1",
      userId: "user_1",
      name: "Lease Contract.pdf",
      mimeType: "application/pdf",
      description: null,
      propertyId: null,
      tenantId: "tenant_1",
      ownerId: null,
    });
    await classifyAndPersist("doc_1");

    expect(mockExtractionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { documentId: "doc_1" },
        create: expect.objectContaining({
          documentId: "doc_1",
          userId: "user_1",
          suggestedType: "contract",
          linkedEntityType: "tenant",
          linkedEntityId: "tenant_1",
          status: "completed",
        }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "OCR_CLASSIFY_DOCUMENT", resourceId: "doc_1" }),
    );
  });
});

describe("reviewExtraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when there is no extraction for the document", async () => {
    mockExtractionFindFirst.mockResolvedValue(null);
    await expect(reviewExtraction("user_1", "doc_1", { accept: true })).rejects.toThrow(
      "No extraction found",
    );
  });

  it("accepts the proposal as-is and applies it to the document", async () => {
    mockExtractionFindFirst.mockResolvedValue({
      documentId: "doc_1",
      suggestedType: "invoice",
      linkedEntityType: "property",
      linkedEntityId: "property_1",
    });
    await reviewExtraction("user_1", "doc_1", { accept: true });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockDocumentUpdate).toHaveBeenCalledWith({
      where: { id: "doc_1" },
      data: { type: "invoice", propertyId: "property_1" },
    });
    expect(mockExtractionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "completed",
          suggestedType: "invoice",
          linkedEntityType: "property",
        }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "OCR_EXTRACTION_REVIEWED" }),
    );
  });

  it("applies a human correction instead of the proposal", async () => {
    mockExtractionFindFirst.mockResolvedValue({
      documentId: "doc_1",
      suggestedType: "other",
      linkedEntityType: null,
      linkedEntityId: null,
    });
    await reviewExtraction("user_1", "doc_1", {
      accept: false,
      type: "certificate",
      linkedEntityType: "tenant",
      linkedEntityId: "tenant_9",
    });

    expect(mockDocumentUpdate).toHaveBeenCalledWith({
      where: { id: "doc_1" },
      data: { type: "certificate", tenantId: "tenant_9" },
    });
  });
});
