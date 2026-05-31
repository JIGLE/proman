/**
 * Compliance module — central exports
 *
 * Portugal: Recibos de Renda Eletrónicos, SAF-T PT
 * Spain: NRUA (Ventanilla Única Digital), Ley de Vivienda rent caps
 */

// Portugal
export {
  createRentReceipt,
  listRentReceipts,
  generateReceiptNumber,
  generateReceiptXml,
} from "./rent-receipts-pt";
export type { RentReceiptInput, RentReceiptResult } from "./rent-receipts-pt";

// Spain
export {
  exportLeaseToNRUA,
  generateNRUAXml,
  validateNRUAData,
  validateNifNie,
  validateCadasterReference,
} from "./nrua-export";
export type { NRUAExportData } from "./nrua-export";
