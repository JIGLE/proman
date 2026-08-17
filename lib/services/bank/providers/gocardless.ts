/**
 * GoCardless Bank Account Data (formerly Nordigen) — PSD2 account information.
 *
 * Chosen for Portugal and Spain because GoCardless holds the AISP licence, so a self-hosted
 * instance needs no licence of its own; the free tier has no per-call cost; and it exposes a
 * sandbox institution that is a REAL API call against test data. That last point matters here:
 * the tax connectors have no live endpoint and must say so everywhere they appear, whereas this
 * can be exercised end to end honestly.
 *
 * Auth is a secret pair exchanged for a 24h access token. The token is held in memory only —
 * persisting it would add a second secret at rest to protect for no benefit, since minting a new
 * one is a single cheap call.
 */

import type { BankCsvRow } from "../csv";
import type {
  BankDataProvider,
  ConsentLink,
  ConsentRequest,
  Institution,
  ProviderAccount,
} from "./types";
import { ConsentExpiredError } from "./types";

const API_BASE = "https://bankaccountdata.gocardless.com/api/v2";

/**
 * Requisition statuses that mean "this consent will never produce data again".
 * EX expired, RJ rejected by the user or bank, SU suspended after repeated failures.
 * Everything else is either in progress (CR/GC/UA/SA/GA) or healthy (LN).
 */
const DEAD_REQUISITION_STATUSES = new Set(["EX", "RJ", "SU"]);

/** Provider default. GoCardless caps this at 180; asking for more is rejected outright. */
const DEFAULT_ACCESS_DAYS = 90;
const MAX_ACCESS_DAYS = 180;

interface GoCardlessAmount {
  amount?: string;
  currency?: string;
}

interface GoCardlessParty {
  iban?: string;
}

/** One transaction as GoCardless returns it. Every field is optional in practice — banks differ. */
export interface GoCardlessTransaction {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount?: GoCardlessAmount;
  creditorName?: string;
  creditorAccount?: GoCardlessParty;
  debtorName?: string;
  debtorAccount?: GoCardlessParty;
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  additionalInformation?: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Exported for tests — a module-level cache would otherwise leak between cases. */
export function resetTokenCache(): void {
  cachedToken = null;
}

function credentials(): { secretId: string; secretKey: string } | null {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;
  if (!secretId || !secretKey) return null;
  return { secretId, secretKey };
}

/** Whether this instance is configured to offer bank connections at all. */
export function isGoCardlessConfigured(): boolean {
  return credentials() !== null;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const creds = credentials();
  if (!creds) {
    throw new Error(
      "GoCardless is not configured. Set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY.",
    );
  }

  // GoCardless's own host, not /api/*: it never passes through proxy.ts's CSRF check, and
  // attaching our token would disclose it to an external host.
  // eslint-disable-next-line no-restricted-syntax
  const response = await fetch(`${API_BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ secret_id: creds.secretId, secret_key: creds.secretKey }),
  });

  if (!response.ok) {
    // Deliberately no body echo: a failed token call can quote the credentials back.
    throw new Error(`GoCardless authentication failed (HTTP ${response.status})`);
  }

  const body = (await response.json()) as { access?: string; access_expires?: number };
  if (!body.access) throw new Error("GoCardless authentication returned no access token");

  // Expire a minute early so a token cannot lapse mid-request.
  const lifetimeSeconds = body.access_expires ?? 86400;
  cachedToken = { value: body.access, expiresAt: Date.now() + (lifetimeSeconds - 60) * 1000 };
  return cachedToken.value;
}

async function apiCall<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    // At an account or requisition path this is the shape a revoked consent takes.
    throw new ConsentExpiredError();
  }
  if (response.status === 429) {
    throw new Error(
      "GoCardless rate limit reached for this account. Bank data providers cap how often " +
        "each account may be read per day; try again later.",
    );
  }
  if (!response.ok) {
    throw new Error(`GoCardless request failed (HTTP ${response.status})`);
  }

  return (await response.json()) as T;
}

/**
 * Map one GoCardless transaction to the row shape the import pipeline consumes.
 *
 * Pure and exported so it can be tested against recorded payloads without any network. Most of
 * the risk in this integration lives here — a sign error or a swapped counterparty silently
 * mis-matches rent.
 */
export function mapTransaction(tx: GoCardlessTransaction): BankCsvRow | null {
  const rawAmount = tx.transactionAmount?.amount;
  const amount = rawAmount === undefined ? NaN : Number(rawAmount);
  const bookingDate = tx.bookingDate ?? tx.valueDate;

  // Without an amount or a date there is nothing to match on, and a fingerprint built from
  // undefined would collide with every other broken row.
  if (!Number.isFinite(amount) || !bookingDate) return null;

  // Which party is the counterparty depends on direction: money IN comes from the debtor
  // (the tenant), money OUT goes to the creditor. Banks frequently populate only one side, so
  // each falls back to the other rather than dropping the name.
  const incoming = amount > 0;
  const counterpartyName = incoming
    ? (tx.debtorName ?? tx.creditorName)
    : (tx.creditorName ?? tx.debtorName);
  const counterpartyIban = incoming
    ? (tx.debtorAccount?.iban ?? tx.creditorAccount?.iban)
    : (tx.creditorAccount?.iban ?? tx.debtorAccount?.iban);

  // Portuguese and Spanish banks split the reference across the array form about as often as
  // they use the scalar one; `additionalInformation` is the last resort some use for both.
  const reference =
    tx.remittanceInformationUnstructured ??
    (tx.remittanceInformationUnstructuredArray?.length
      ? tx.remittanceInformationUnstructuredArray.join(" ")
      : undefined) ??
    tx.additionalInformation;

  return {
    bookingDate,
    valueDate: tx.valueDate,
    amount,
    counterpartyName: counterpartyName || undefined,
    counterpartyIban: counterpartyIban || undefined,
    reference: reference || undefined,
  };
}

function clampAccessDays(requested?: number): number {
  if (!requested || !Number.isFinite(requested)) return DEFAULT_ACCESS_DAYS;
  return Math.min(Math.max(Math.trunc(requested), 1), MAX_ACCESS_DAYS);
}

export const goCardlessProvider: BankDataProvider = {
  key: "gocardless",

  async listInstitutions(country: string): Promise<Institution[]> {
    const list = await apiCall<
      { id: string; name: string; transaction_total_days?: string; logo?: string }[]
    >(`/institutions/?country=${encodeURIComponent(country.toLowerCase())}`);

    return list.map((i) => ({
      id: i.id,
      name: i.name,
      country: country.toUpperCase(),
      logoUrl: i.logo,
      maxHistoricalDays: i.transaction_total_days ? Number(i.transaction_total_days) : undefined,
    }));
  },

  async createConsentLink(request: ConsentRequest): Promise<ConsentLink> {
    const accessDays = clampAccessDays(request.accessValidForDays);

    // An explicit end-user agreement is what makes the consent window ours to choose rather than
    // the provider's 90-day default, and it is also where the requested scope is pinned.
    const agreement = await apiCall<{ id: string }>("/agreements/enduser/", {
      method: "POST",
      body: JSON.stringify({
        institution_id: request.institutionId,
        max_historical_days: request.maxHistoricalDays ?? 90,
        access_valid_for_days: accessDays,
        access_scope: ["details", "transactions"],
      }),
    });

    const requisition = await apiCall<{ id: string; link: string }>("/requisitions/", {
      method: "POST",
      body: JSON.stringify({
        redirect: request.redirectUrl,
        institution_id: request.institutionId,
        agreement: agreement.id,
        reference: request.reference,
      }),
    });

    const expiresAt = new Date(Date.now() + accessDays * 24 * 60 * 60 * 1000);
    return { providerRef: requisition.id, url: requisition.link, expiresAt };
  },

  async completeConsent(providerRef: string): Promise<ProviderAccount[]> {
    const requisition = await apiCall<{ status?: string; accounts?: string[] }>(
      `/requisitions/${encodeURIComponent(providerRef)}/`,
    );

    if (requisition.status && DEAD_REQUISITION_STATUSES.has(requisition.status)) {
      throw new ConsentExpiredError(
        `Bank consent is no longer valid (status ${requisition.status}). Reconnect the account.`,
      );
    }
    if (!requisition.accounts?.length) {
      // Still mid-flow, or the user closed the bank's page before granting access.
      throw new ConsentExpiredError("The bank granted no accounts. Try connecting again.");
    }

    return Promise.all(
      requisition.accounts.map(async (id) => {
        try {
          const details = await apiCall<{
            account?: { iban?: string; currency?: string; name?: string; product?: string };
          }>(`/accounts/${encodeURIComponent(id)}/details/`);
          const account = details.account ?? {};
          return {
            id,
            iban: account.iban,
            currency: account.currency,
            label: account.name || account.product || "Bank account",
          };
        } catch {
          // Details are a separate rate-limited endpoint. Losing them must not lose the account
          // itself — transactions, the thing we actually need, come from a different call.
          return { id, label: "Bank account" };
        }
      }),
    );
  },

  async fetchTransactions(accountRef: string, since?: Date): Promise<BankCsvRow[]> {
    const query = since ? `?date_from=${since.toISOString().slice(0, 10)}` : "";
    const body = await apiCall<{ transactions?: { booked?: GoCardlessTransaction[] } }>(
      `/accounts/${encodeURIComponent(accountRef)}/transactions/${query}`,
    );

    // Booked only. Pending entries have no stable identity and change amount or vanish before
    // settling, so importing them would create fingerprints for movements that never happened.
    const booked = body.transactions?.booked ?? [];
    return booked.map(mapTransaction).filter((row): row is BankCsvRow => row !== null);
  },
};
