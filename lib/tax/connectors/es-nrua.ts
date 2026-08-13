/**
 * Spain — NRUA (Número de Registro Único de Alquiler) connector.
 *
 * Wraps lib/compliance/nrua-export.ts unchanged (cadastral reference and NIF/NIE validation,
 * XML generation). This module owns only the submit/poll lifecycle and the TaxSubmissionLog
 * trail.
 *
 * NOT A MIRROR OF PORTUGAL. The two countries file different things about different objects:
 *
 *   PT — a RentReceipt (Modelo 44) hanging off a Receipt, filed with the Autoridade
 *        Tributária, riding the receipt lifecycle.
 *   ES — an NRUARegistration hanging off a LEASE, filed with MITMA's Ventanilla Única, with
 *        its own status enum (pending → submitted → confirmed/rejected/cancelled).
 *
 * So this connector is driven from the NRUA/lease flow, not from `transitionReceipt`. Forcing
 * a lease registration through a receipt state machine would model it wrong.
 *
 * The connector key is `es_nrua_ventanilla`, not the `es_aeat_info` the schema comment used to
 * suggest: NRUA is filed with the Ministerio de Transportes y Movilidad Sostenible, not with
 * the AEAT. Getting the authority wrong in a key is the kind of thing nobody notices until
 * someone tries to point it at a real endpoint.
 *
 * There is no live MITMA endpoint. submit/poll simulate the round trip in sandbox/review and
 * fail closed in every other mode — see ./mode-guard.ts, which is shared with PT precisely so
 * that rule is not re-derived per country.
 */

import { getPrismaClient } from "@/lib/services/database/database";
import { ensureConnector, logSubmission } from "@/lib/services/tax/connector-service";
import { validateNRUAData, type NRUAExportData } from "@/lib/compliance/nrua-export";
import type { TaxConnector, TaxConnectorResult } from "./types";
import { refuseUnsupportedMode } from "./mode-guard";

export const ES_NRUA_CONNECTOR_KEY = "es_nrua_ventanilla";

/** Named in the refusal message the operator reads. */
const AUTHORITY = "MITMA Ventanilla Única";

/**
 * NRUARegistration carries no `userId` of its own — ownership runs through the property, the
 * same shape as PropertyOwner. Everything the connector needs (the owning user for
 * ensureConnector and the log trail, plus the fields validateNRUAData checks) is loaded here.
 */
async function loadRegistration(registrationId: string) {
  const prisma = getPrismaClient();
  return prisma.nRUARegistration.findUnique({
    where: { id: registrationId },
    include: {
      property: { select: { userId: true, address: true, name: true } },
      tenant: { select: { name: true } },
    },
  });
}

type LoadedRegistration = NonNullable<Awaited<ReturnType<typeof loadRegistration>>>;

/** Project a persisted registration onto the shape lib/compliance already knows how to check. */
function toExportData(registration: LoadedRegistration): NRUAExportData {
  return {
    leaseId: registration.leaseId,
    landlordNif: registration.landlordNif,
    // Not validated by validateNRUAData and not stored on the registration; the property name
    // is the closest honest stand-in rather than inventing a landlord identity.
    landlordName: registration.property?.name ?? "",
    tenantNif: registration.tenantNif,
    tenantName: registration.tenant?.name ?? "",
    propertyReference: registration.propertyReference,
    municipalityCode: registration.municipalityCode,
    monthlyRent: registration.monthlyRent,
    contractStartDate: registration.contractStartDate.toISOString().slice(0, 10),
    contractEndDate: registration.contractEndDate?.toISOString().slice(0, 10),
    contractType: registration.contractType as NRUAExportData["contractType"],
    isZonaTensionada: registration.isZonaTensionada,
    propertyAddress: registration.property?.address ?? "",
  };
}

async function validate(registrationId: string): Promise<{ valid: boolean; errors: string[] }> {
  const registration = await loadRegistration(registrationId);
  if (!registration) return { valid: false, errors: ["NRUA registration not found"] };

  const errors: string[] = [];

  // Mirrors the PT precondition: only an unsent or rejected filing may be submitted. Without
  // this a confirmed registration could be re-submitted and silently regress.
  if (registration.status !== "pending" && registration.status !== "rejected") {
    errors.push(`Cannot submit a registration in NRUA status "${registration.status}"`);
  }

  errors.push(...validateNRUAData(toExportData(registration)).errors);

  return { valid: errors.length === 0, errors };
}

async function submit(registrationId: string): Promise<TaxConnectorResult> {
  const prisma = getPrismaClient();
  const registration = await loadRegistration(registrationId);
  if (!registration) return { status: "error", responseBody: "NRUA registration not found" };

  const userId = registration.property.userId;
  const connector = await ensureConnector(userId, "ES", ES_NRUA_CONNECTOR_KEY);

  // Before validation and before any state change — a registration must not move to
  // "submitted" on a connector whose mode this code cannot honour.
  const refusal = await refuseUnsupportedMode({
    connector,
    userId,
    subjectType: "nrua",
    subjectId: registrationId,
    action: "submit",
    authority: AUTHORITY,
  });
  if (refusal) return refusal;

  const validation = await validate(registrationId);
  if (!validation.valid) {
    const responseBody = validation.errors.join("; ");
    await logSubmission({
      userId,
      connectorId: connector.id,
      subjectType: "nrua",
      subjectId: registrationId,
      action: "submit",
      mode: connector.mode,
      status: "error",
      responseBody,
    });
    return { status: "error", responseBody };
  }

  // Mode is part of the identifier on purpose: a simulated registration number should be
  // recognisable as one at a glance, wherever it is later displayed or exported.
  const registrationNumber = `${connector.mode.toUpperCase()}-NRUA-${registrationId.slice(0, 8)}-${Date.now()}`;
  await prisma.nRUARegistration.update({
    where: { id: registrationId },
    data: { status: "submitted", registrationNumber, submittedAt: new Date() },
  });

  await logSubmission({
    userId,
    connectorId: connector.id,
    subjectType: "nrua",
    subjectId: registrationId,
    action: "submit",
    mode: connector.mode,
    status: "success",
    responseCode: "202",
    responseBody: registrationNumber,
  });

  return { status: "success", responseCode: "202", responseBody: registrationNumber };
}

async function poll(registrationId: string): Promise<TaxConnectorResult> {
  const prisma = getPrismaClient();
  const registration = await loadRegistration(registrationId);
  if (!registration) return { status: "error", responseBody: "NRUA registration not found" };

  const userId = registration.property.userId;
  const connector = await ensureConnector(userId, "ES", ES_NRUA_CONNECTOR_KEY);

  // Same guard as submit: without it, poll() would mark the registration confirmed by MITMA
  // regardless of mode.
  const refusal = await refuseUnsupportedMode({
    connector,
    userId,
    subjectType: "nrua",
    subjectId: registrationId,
    action: "poll",
    authority: AUTHORITY,
  });
  if (refusal) return refusal;

  if (registration.status !== "submitted") {
    const responseBody = `Cannot poll a registration in NRUA status "${registration.status}"`;
    await logSubmission({
      userId,
      connectorId: connector.id,
      subjectType: "nrua",
      subjectId: registrationId,
      action: "poll",
      mode: connector.mode,
      status: "error",
      responseBody,
    });
    return { status: "error", responseBody };
  }

  // Sandbox/review auto-confirm — there is no live Ventanilla Única endpoint to poll.
  await prisma.nRUARegistration.update({
    where: { id: registrationId },
    data: { status: "confirmed", confirmedAt: new Date() },
  });

  await logSubmission({
    userId,
    connectorId: connector.id,
    subjectType: "nrua",
    subjectId: registrationId,
    action: "poll",
    mode: connector.mode,
    status: "success",
    responseCode: "200",
    responseBody: "confirmed",
  });

  return { status: "success", responseCode: "200", responseBody: "confirmed" };
}

export const esNruaConnector: TaxConnector = {
  key: ES_NRUA_CONNECTOR_KEY,
  country: "ES",
  validate,
  submit,
  poll,
};
