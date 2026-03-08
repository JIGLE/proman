/**
 * NRUA Export Module — Spain
 * Registro Único de Arrendamientos / Ventanilla Única Digital
 *
 * Generates the XML payload required by MITMA for mandatory
 * rental contract registration (effective 2026).
 *
 * @see Ley 12/2023, de 24 de mayo, por el derecho a la vivienda
 * @see Real Decreto (pending) implementing Ventanilla Única Digital
 */

import { getPrismaClient } from "@/lib/services/database/database";

export interface NRUAExportData {
  leaseId: string;
  landlordNif: string;
  landlordName: string;
  tenantNif: string;
  tenantName: string;
  propertyReference: string; // Referencia catastral
  municipalityCode: string; // INE code
  monthlyRent: number;
  contractStartDate: string; // ISO date
  contractEndDate?: string;
  contractType:
    | "VIVIENDA_HABITUAL"
    | "VIVIENDA_TEMPORAL"
    | "VIVIENDA_TURISTICA";
  isZonaTensionada: boolean;
  propertyAddress: string;
  propertySurfaceM2?: number;
}

/**
 * Validate a Spanish NIF/NIE
 */
export function validateNifNie(nif: string): boolean {
  if (!nif || nif.length !== 9) return false;

  // NIF: 8 digits + letter
  const nifPattern = /^[0-9]{8}[A-Z]$/;
  // NIE: X/Y/Z + 7 digits + letter
  const niePattern = /^[XYZ][0-9]{7}[A-Z]$/;

  const upper = nif.toUpperCase();
  if (!nifPattern.test(upper) && !niePattern.test(upper)) return false;

  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
  let numStr = upper;

  if (upper.startsWith("X")) numStr = "0" + upper.slice(1);
  else if (upper.startsWith("Y")) numStr = "1" + upper.slice(1);
  else if (upper.startsWith("Z")) numStr = "2" + upper.slice(1);

  const num = parseInt(numStr.slice(0, 8), 10);
  const expectedLetter = letters[num % 23];

  return upper.charAt(8) === expectedLetter;
}

/**
 * Validate a referencia catastral (Spanish cadaster reference)
 * Format: 14 or 20 characters alphanumeric
 */
export function validateCadasterReference(ref: string): boolean {
  const clean = ref.replace(/\s/g, "").toUpperCase();
  return /^[A-Z0-9]{14}$|^[A-Z0-9]{20}$/.test(clean);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate NRUA XML payload for Ventanilla Única Digital submission
 */
export function generateNRUAXml(data: NRUAExportData): string {
  const contractTypeMap: Record<string, string> = {
    VIVIENDA_HABITUAL: "01",
    VIVIENDA_TEMPORAL: "02",
    VIVIENDA_TURISTICA: "03",
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<RegistroArrendamiento xmlns="urn:es:mitma:nrua:v1.0">
  <DatosArrendador>
    <NIF>${escapeXml(data.landlordNif)}</NIF>
    <Nombre>${escapeXml(data.landlordName)}</Nombre>
  </DatosArrendador>
  <DatosArrendatario>
    <NIF>${escapeXml(data.tenantNif)}</NIF>
    <Nombre>${escapeXml(data.tenantName)}</Nombre>
  </DatosArrendatario>
  <DatosInmueble>
    <ReferenciaCatastral>${escapeXml(data.propertyReference)}</ReferenciaCatastral>
    <CodigoMunicipio>${escapeXml(data.municipalityCode)}</CodigoMunicipio>
    <Direccion>${escapeXml(data.propertyAddress)}</Direccion>
    ${data.propertySurfaceM2 ? `<SuperficieM2>${data.propertySurfaceM2.toFixed(2)}</SuperficieM2>` : ""}
    <ZonaTensionada>${data.isZonaTensionada ? "S" : "N"}</ZonaTensionada>
  </DatosInmueble>
  <DatosContrato>
    <TipoContrato>${contractTypeMap[data.contractType] || "01"}</TipoContrato>
    <RentaMensual>${data.monthlyRent.toFixed(2)}</RentaMensual>
    <FechaInicio>${data.contractStartDate}</FechaInicio>
    ${data.contractEndDate ? `<FechaFin>${data.contractEndDate}</FechaFin>` : ""}
  </DatosContrato>
</RegistroArrendamiento>`;
}

/**
 * Export and persist NRUA registration for a lease
 */
export async function exportLeaseToNRUA(
  leaseId: string,
  landlordNif: string,
  landlordName: string,
): Promise<{
  success: boolean;
  registrationId?: string;
  xml?: string;
  errors?: string[];
}> {
  const prisma = getPrismaClient();
  const errors: string[] = [];

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: { tenant: true, property: true },
  });

  if (!lease) return { success: false, errors: ["Lease not found"] };
  if (!lease.tenant)
    return { success: false, errors: ["Tenant not found on lease"] };
  if (!lease.property)
    return { success: false, errors: ["Property not found on lease"] };

  if (!validateNifNie(landlordNif)) errors.push("Invalid landlord NIF/NIE");
  // Tenant NIF is optional — foreign tenants may not have one

  if (errors.length > 0) return { success: false, errors };

  const exportData: NRUAExportData = {
    leaseId: lease.id,
    landlordNif,
    landlordName,
    tenantNif: "", // populated below
    tenantName: lease.tenant.name,
    propertyReference:
      ((lease.property as Record<string, unknown>)
        .cadasterReference as string) || "",
    municipalityCode: "",
    monthlyRent: lease.monthlyRent,
    contractStartDate: lease.startDate.toISOString().split("T")[0],
    contractEndDate: lease.endDate.toISOString().split("T")[0],
    contractType: "VIVIENDA_HABITUAL",
    isZonaTensionada:
      ((lease as Record<string, unknown>).isZonaTensionada as boolean) || false,
    propertyAddress: lease.property.address,
  };

  const xml = generateNRUAXml(exportData);

  // Persist registration record
  const registration = await prisma.nRUARegistration.create({
    data: {
      leaseId: lease.id,
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      landlordNif,
      tenantNif: exportData.tenantNif || "PENDING",
      propertyReference: exportData.propertyReference,
      municipalityCode: exportData.municipalityCode,
      monthlyRent: lease.monthlyRent,
      contractStartDate: lease.startDate,
      contractEndDate: lease.endDate,
      contractType: "VIVIENDA_HABITUAL",
      isZonaTensionada: exportData.isZonaTensionada,
      status: "pending",
      exportedXml: xml,
    },
  });

  return {
    success: true,
    registrationId: registration.id,
    xml,
  };
}

/**
 * Validate NRUA registration completeness
 */
export function validateNRUAData(data: NRUAExportData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.landlordNif || !validateNifNie(data.landlordNif)) {
    errors.push("Landlord NIF/NIE is required and must be valid");
  }
  if (!data.tenantName) errors.push("Tenant name is required");
  if (!data.propertyAddress) errors.push("Property address is required");
  if (!data.monthlyRent || data.monthlyRent <= 0)
    errors.push("Monthly rent must be positive");
  if (!data.contractStartDate) errors.push("Contract start date is required");
  if (
    data.propertyReference &&
    !validateCadasterReference(data.propertyReference)
  ) {
    errors.push(
      "Invalid referencia catastral format (must be 14 or 20 alphanumeric characters)",
    );
  }

  return { valid: errors.length === 0, errors };
}
