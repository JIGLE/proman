import { describe, expect, it } from "vitest";

import { classifyDocument } from "./classifier";

describe("classifyDocument", () => {
  it("recognizes an English contract filename and marks completed when linked", () => {
    const result = classifyDocument({
      name: "Lease Contract 2026.pdf",
      mimeType: "application/pdf",
      existingTenantId: "tenant_1",
    });
    expect(result.suggestedType).toBe("contract");
    expect(result.confidence).toBe(0.9);
    expect(result.linkedEntityType).toBe("tenant");
    expect(result.linkedEntityId).toBe("tenant_1");
    expect(result.status).toBe("completed");
  });

  it("recognizes Portuguese, Spanish and Italian keywords", () => {
    expect(
      classifyDocument({ name: "contrato-arrendamento.pdf", mimeType: "application/pdf" })
        .suggestedType,
    ).toBe("contract");
    expect(
      classifyDocument({ name: "factura-julio.pdf", mimeType: "application/pdf" }).suggestedType,
    ).toBe("invoice");
    expect(
      classifyDocument({ name: "ricevuta-affitto.pdf", mimeType: "application/pdf" }).suggestedType,
    ).toBe("receipt");
    expect(
      classifyDocument({ name: "apólice-seguro.pdf", mimeType: "application/pdf" }).suggestedType,
    ).toBe("certificate");
  });

  it("matches keywords in the description when the filename is generic", () => {
    const result = classifyDocument({
      name: "scan001.pdf",
      mimeType: "application/pdf",
      description: "Certificado energético do imóvel",
    });
    expect(result.suggestedType).toBe("certificate");
  });

  it("falls back to photo for unrecognized image files", () => {
    const result = classifyDocument({ name: "IMG_4821.jpg", mimeType: "image/jpeg" });
    expect(result.suggestedType).toBe("photo");
    expect(result.confidence).toBe(0.6);
    expect(result.status).toBe("review_required");
  });

  it("falls back to other for unrecognized non-image files", () => {
    const result = classifyDocument({ name: "document.pdf", mimeType: "application/pdf" });
    expect(result.suggestedType).toBe("other");
    expect(result.confidence).toBe(0.3);
  });

  it("requires review when the type is confident but no entity is linked", () => {
    const result = classifyDocument({ name: "invoice-042.pdf", mimeType: "application/pdf" });
    expect(result.suggestedType).toBe("invoice");
    expect(result.linkedEntityType).toBeNull();
    expect(result.status).toBe("review_required");
  });

  it("requires review when linked but the type is ambiguous", () => {
    const result = classifyDocument({
      name: "scan001.pdf",
      mimeType: "application/pdf",
      existingPropertyId: "property_1",
    });
    expect(result.status).toBe("review_required");
    expect(result.linkedEntityType).toBe("property");
  });

  it("prefers tenant over property over owner when multiple are tagged", () => {
    const result = classifyDocument({
      name: "contract.pdf",
      mimeType: "application/pdf",
      existingTenantId: "tenant_1",
      existingPropertyId: "property_1",
      existingOwnerId: "owner_1",
    });
    expect(result.linkedEntityType).toBe("tenant");
  });
});
