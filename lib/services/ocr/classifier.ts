/**
 * Situs mock OCR classifier — pure, no IO. Proposes a document type from
 * filename/description keywords across the four product locales, and
 * whether the document already carries enough context (a tagged property/
 * tenant/owner from the upload flow) to auto-link, or needs a human in the
 * Review Required tab. No real content extraction happens here — this is
 * the mock-first engine (matches the bank/tax connector pattern): a live
 * OCR provider is a later `engine` value, not a shape change.
 */

export type SuggestedDocumentType =
  "contract" | "invoice" | "receipt" | "photo" | "floor_plan" | "certificate" | "other";

export type LinkedEntityType = "tenant" | "property" | "owner" | null;

export interface ClassifyInput {
  name: string;
  mimeType: string;
  description?: string | null;
  existingPropertyId?: string | null;
  existingTenantId?: string | null;
  existingOwnerId?: string | null;
}

export interface ClassifyResult {
  suggestedType: SuggestedDocumentType;
  confidence: number;
  extractedFields: Record<string, string>;
  linkedEntityType: LinkedEntityType;
  linkedEntityId: string | null;
  status: "completed" | "review_required";
}

const KEYWORD_TYPES: [SuggestedDocumentType, string[]][] = [
  ["contract", ["contract", "contrato", "contratto", "lease", "arrendamento", "alquiler"]],
  ["invoice", ["invoice", "fatura", "factura", "fattura"]],
  ["receipt", ["receipt", "recibo", "ricevuta"]],
  [
    "certificate",
    [
      "certificate",
      "certidao",
      "certidão",
      "certificado",
      "certificato",
      "insurance",
      "seguro",
      "apolice",
      "apólice",
      "polizza",
    ],
  ],
  ["floor_plan", ["floorplan", "floor_plan", "floor-plan", "planta", "plano", "pianta"]],
];

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function matchKeywordType(text: string): SuggestedDocumentType | null {
  const normalized = normalize(text);
  for (const [type, keywords] of KEYWORD_TYPES) {
    if (keywords.some((k) => normalized.includes(k))) return type;
  }
  return null;
}

export function classifyDocument(input: ClassifyInput): ClassifyResult {
  const haystack = `${input.name} ${input.description ?? ""}`;
  const keywordType = matchKeywordType(haystack);

  let suggestedType: SuggestedDocumentType;
  let confidence: number;
  if (keywordType) {
    suggestedType = keywordType;
    confidence = 0.9;
  } else if (input.mimeType.startsWith("image/")) {
    suggestedType = "photo";
    confidence = 0.6;
  } else {
    suggestedType = "other";
    confidence = 0.3;
  }

  let linkedEntityType: LinkedEntityType = null;
  let linkedEntityId: string | null = null;
  if (input.existingTenantId) {
    linkedEntityType = "tenant";
    linkedEntityId = input.existingTenantId;
  } else if (input.existingPropertyId) {
    linkedEntityType = "property";
    linkedEntityId = input.existingPropertyId;
  } else if (input.existingOwnerId) {
    linkedEntityType = "owner";
    linkedEntityId = input.existingOwnerId;
  }

  // Confident on type AND already linked to an entity from the upload flow
  // → no human step needed. Anything else (ambiguous type, or landed in the
  // Inbox with no entity context) needs a review.
  const status = keywordType && linkedEntityId ? "completed" : "review_required";

  return {
    suggestedType,
    confidence,
    extractedFields: { matchedKeyword: keywordType ?? "" },
    linkedEntityType,
    linkedEntityId,
    status,
  };
}
