/**
 * Portugal — Recibos de Renda Eletrónicos connector.
 *
 * Wraps lib/compliance/rent-receipts-pt.ts unchanged (numbering, 5-day
 * rule, Modelo 44 XML already generated at RentReceipt creation). This
 * module only owns the submit/poll lifecycle against the Autoridade
 * Tributária and the TaxSubmissionLog trail. There is no live AT endpoint
 * integrated yet (deferred — see plan risk register: "Connector mode
 * locked to Review/Sandbox"), so submit/poll simulate the round trip:
 * sandbox and review both synthesize an acknowledgement rather than call
 * out, and every call is logged exactly as a live call would be.
 *
 * That simulation is opt-in per mode (SIMULATED_MODES below) and every other
 * mode fails closed. Upgrading to a real integration therefore means writing
 * the endpoint and widening that set on purpose — it is deliberately NOT
 * something a `mode` column edit can switch on, because the simulation would
 * otherwise report receipts as accepted by the AT with nothing sent.
 */

import { getPrismaClient } from "@/lib/services/database/database";
import { validateNIF } from "@/lib/tax/saft-pt";
import { ensureConnector, logSubmission } from "@/lib/services/tax/connector-service";
import type { TaxConnector, TaxConnectorResult } from "./types";

export const PT_AT_CONNECTOR_KEY = "pt_at_recibos";

/** Modes this connector can actually honour. Anything else must fail closed. */
const SIMULATED_MODES = new Set(["sandbox", "review"]);

/**
 * Refuse to act when the connector is not in a mode this code can honour.
 *
 * The danger here is the inverse of the obvious one. Test data cannot reach the Autoridade
 * Tributária, because nothing in this file makes a network call. The risk is that `submit`
 * and `poll` used to run their simulation REGARDLESS of mode — so flipping the `mode` column
 * to "live" (an unconstrained String, and the first thing anyone would try) made Situs report
 * rent receipts as submitted and then accepted by the AT when nothing had been sent. A
 * landlord would believe they had filed. A fabricated acceptance on a fiscal record is worse
 * than a visible failure.
 *
 * So the simulation is now explicitly opt-in per mode. Upgrading to a real integration means
 * implementing the endpoint and widening this set deliberately — not editing a database row.
 *
 * The refusal is logged, not silent: an operator who flipped the mode needs to find out why
 * nothing is being submitted, and TaxSubmissionLog is where they will look.
 */
async function refuseUnsupportedMode(
  connector: { id: string; mode: string },
  userId: string,
  rentReceiptId: string,
  action: "submit" | "poll",
): Promise<TaxConnectorResult | null> {
  if (SIMULATED_MODES.has(connector.mode)) return null;

  const responseBody =
    `Connector mode "${connector.mode}" is not supported: there is no live Autoridade ` +
    `Tributária integration. Nothing was submitted. Set the connector back to "sandbox" or ` +
    `"review".`;

  await logSubmission({
    userId,
    connectorId: connector.id,
    subjectType: "rent_receipt",
    subjectId: rentReceiptId,
    action,
    mode: connector.mode,
    status: "error",
    responseBody,
  });

  return { status: "error", responseBody };
}

async function validate(rentReceiptId: string): Promise<{ valid: boolean; errors: string[] }> {
  const prisma = getPrismaClient();
  const receipt = await prisma.rentReceipt.findUnique({ where: { id: rentReceiptId } });
  if (!receipt) return { valid: false, errors: ["Rent receipt not found"] };

  const errors: string[] = [];
  if (!validateNIF(receipt.landlordNif)) errors.push("Invalid landlord NIF");
  if (receipt.tenantNif && !validateNIF(receipt.tenantNif)) errors.push("Invalid tenant NIF");
  if (!receipt.xmlPayload) errors.push("Missing Modelo 44 XML payload");
  if (receipt.status !== "draft" && receipt.status !== "rejected") {
    errors.push(`Cannot submit a receipt in AT status "${receipt.status}"`);
  }
  return { valid: errors.length === 0, errors };
}

async function submit(rentReceiptId: string): Promise<TaxConnectorResult> {
  const prisma = getPrismaClient();
  const receipt = await prisma.rentReceipt.findUniqueOrThrow({ where: { id: rentReceiptId } });
  const connector = await ensureConnector(receipt.userId, "PT", PT_AT_CONNECTOR_KEY);

  // Before validation, and before any state change — a receipt must not move to "submitted"
  // on a connector whose mode this code cannot honour.
  const refusal = await refuseUnsupportedMode(connector, receipt.userId, rentReceiptId, "submit");
  if (refusal) return refusal;

  const validation = await validate(rentReceiptId);
  if (!validation.valid) {
    await logSubmission({
      userId: receipt.userId,
      connectorId: connector.id,
      subjectType: "rent_receipt",
      subjectId: rentReceiptId,
      action: "submit",
      mode: connector.mode,
      status: "error",
      responseBody: validation.errors.join("; "),
    });
    return { status: "error", responseBody: validation.errors.join("; ") };
  }

  const submissionId = `${connector.mode.toUpperCase()}-${rentReceiptId.slice(0, 8)}-${Date.now()}`;
  await prisma.rentReceipt.update({
    where: { id: rentReceiptId },
    data: { status: "submitted", atSubmissionId: submissionId, submittedAt: new Date() },
  });

  await logSubmission({
    userId: receipt.userId,
    connectorId: connector.id,
    subjectType: "rent_receipt",
    subjectId: rentReceiptId,
    action: "submit",
    mode: connector.mode,
    status: "success",
    responseCode: "202",
    responseBody: submissionId,
  });

  return { status: "success", responseCode: "202", responseBody: submissionId };
}

async function poll(rentReceiptId: string): Promise<TaxConnectorResult> {
  const prisma = getPrismaClient();
  const receipt = await prisma.rentReceipt.findUniqueOrThrow({ where: { id: rentReceiptId } });
  const connector = await ensureConnector(receipt.userId, "PT", PT_AT_CONNECTOR_KEY);

  // Same guard as submit: without it, poll() unconditionally marked the receipt "accepted".
  const refusal = await refuseUnsupportedMode(connector, receipt.userId, rentReceiptId, "poll");
  if (refusal) return refusal;

  if (receipt.status !== "submitted") {
    const responseBody = `Cannot poll a receipt in AT status "${receipt.status}"`;
    await logSubmission({
      userId: receipt.userId,
      connectorId: connector.id,
      subjectType: "rent_receipt",
      subjectId: rentReceiptId,
      action: "poll",
      mode: connector.mode,
      status: "error",
      responseBody,
    });
    return { status: "error", responseBody };
  }

  // Sandbox/review connectors auto-accept — there is no live AT endpoint to
  // poll yet.
  await prisma.rentReceipt.update({
    where: { id: rentReceiptId },
    data: { status: "accepted", atResponseCode: "200" },
  });

  await logSubmission({
    userId: receipt.userId,
    connectorId: connector.id,
    subjectType: "rent_receipt",
    subjectId: rentReceiptId,
    action: "poll",
    mode: connector.mode,
    status: "success",
    responseCode: "200",
    responseBody: "accepted",
  });

  return { status: "success", responseCode: "200", responseBody: "accepted" };
}

export const ptAtConnector: TaxConnector = {
  key: PT_AT_CONNECTOR_KEY,
  country: "PT",
  validate,
  submit,
  poll,
};
