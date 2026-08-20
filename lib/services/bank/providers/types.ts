/**
 * Situs bank data provider contract — PSD2 account information (AIS).
 *
 * A provider's job is narrow on purpose: authenticate, walk the consent flow, and hand back
 * transactions as `BankCsvRow[]`. It does NOT match, dedupe, score or allocate — that pipeline
 * already exists in `lib/services/bank/import.ts` and is exercised by its own tests. Returning
 * the same row shape CSV import produces is what lets a live connection reuse all of it, so a
 * provider gets the fingerprint dedupe, the reconciliation rules, the confidence engine and the
 * 0.85 auto-allocation threshold for free, and behaves identically to a hand-uploaded statement.
 *
 * WHY THIS FILE HAS NO RUNTIME IMPORTS, AND MUST KEEP NONE.
 *
 * `lib/tax/connectors/modes.ts` records the failure this avoids: a "use client" component
 * imported a presentation helper, which imported a guard, which reached Prisma and therefore
 * `better-sqlite3`'s native binding. `next build` failed while `tsc --noEmit`, ESLint and Vitest
 * all passed, because none of them bundle for a browser. The connect UI needs these types, so
 * this module stays type-only — `import type` is fine, a value import is not.
 */

import type { BankCsvRow } from "../csv";

/** A bank the provider can connect to, for the institution picker. */
export interface Institution {
  /** Provider-scoped id, opaque to everything outside the adapter that issued it. */
  id: string;
  name: string;
  /** ISO-3166 alpha-2, upper case. */
  country: string;
  logoUrl?: string;
  /**
   * How many days of history this institution will return. Banks differ wildly (30–730), and
   * the first sync should not silently look like "no movements" because the bank only offers a
   * fortnight.
   */
  maxHistoricalDays?: number;
}

export interface ConsentRequest {
  institutionId: string;
  /** Absolute URL the bank returns the user to. Must be pre-registered with the provider. */
  redirectUrl: string;
  /**
   * Opaque value echoed back on the callback. It is the ONLY thing tying a returning consent to
   * the account that started it — see `app/api/bank/connections/callback/route.ts`.
   */
  reference: string;
  /** Requested consent lifetime in days. Providers cap this; the provider clamps rather than throws. */
  accessValidForDays?: number;
  maxHistoricalDays?: number;
}

export interface ConsentLink {
  /** The provider's own id for this consent, persisted as `BankConnection.consentId`. */
  providerRef: string;
  /** Where to send the user to authenticate with their bank. */
  url: string;
  /** When the consent lapses and the user must re-authorise. Null when the provider does not say. */
  expiresAt: Date | null;
}

/** An account the user granted access to, discovered after consent completes. */
export interface ProviderAccount {
  /** Provider-scoped account id, used for later transaction fetches. */
  id: string;
  iban?: string;
  currency?: string;
  /** Human label — account name, product name, or the institution as a fallback. */
  label: string;
}

/**
 * Thrown when a consent has lapsed or been revoked at the bank.
 *
 * Distinct from a generic failure because the remedy is different and the UI must say so: an
 * expired consent needs the user to re-authorise, and reporting it as "0 new movements" would be
 * a silent, indefinite outage of the thing the feature exists to do.
 */
export class ConsentExpiredError extends Error {
  constructor(message = "Bank consent has expired and must be renewed") {
    super(message);
    this.name = "ConsentExpiredError";
  }
}

export interface BankDataProvider {
  /** Stable key; `BankConnection.provider` is stored as `psd2_<key>`. */
  key: string;

  /** Name for the picker, shown only when an instance has more than one provider. */
  displayName: string;

  /**
   * Whether this instance holds usable credentials for this provider.
   *
   * Lives on the provider because the registry used to name one key and return `false` for
   * every other — so a second adapter could be registered, resolved and fully credentialled, and
   * still never be offered, with no error anywhere to say why. Registering a provider is now the
   * only step needed to make it available.
   */
  isConfigured(): boolean;

  /**
   * Provider reads allowed per connection per day, enforced by `sync.ts` BEFORE a call is spent.
   *
   * This is a commercial term, not a property of open banking, so it belongs to the adapter that
   * knows it. It was a module-level `DAILY_SYNC_BUDGET = 4` justified entirely by one provider's
   * free tier — a rule that would have outlived the vendor that explained it.
   *
   * Under-syncing costs a delay; over-syncing can cost a whole day of 429s. Be conservative.
   */
  dailyReadBudget: number;

  /** Banks available in a country, for the picker. */
  listInstitutions(country: string): Promise<Institution[]>;

  /** Begin consent. Returns the URL to send the user to. */
  createConsentLink(request: ConsentRequest): Promise<ConsentLink>;

  /**
   * Finish consent and list the accounts it granted.
   * Throws `ConsentExpiredError` if the user abandoned or the bank refused.
   */
  completeConsent(providerRef: string): Promise<ProviderAccount[]>;

  /**
   * Transactions for one account, in the shape the import pipeline already consumes.
   * Throws `ConsentExpiredError` once the consent lapses.
   */
  fetchTransactions(accountRef: string, since?: Date): Promise<BankCsvRow[]>;
}
