/**
 * The read model behind the admin status page.
 *
 * Its job is narrow and specific: tell an operator which of this instance's connections are
 * real, which are simulated, which are misconfigured, and what to do about each. It exists
 * because that information was scattered across a server log, two per-user connector screens
 * and a set of environment variables, so the only way to discover that (say) the database schema
 * had drifted was to notice unrelated pages returning 500.
 *
 * TWO RULES THIS FILE MUST KEEP.
 *
 * 1. It never reports a connection as live. No country has a live tax-authority integration and
 *    there is no bank feed; every filing is simulated. `severity` is derived from the same
 *    `SIMULATED_MODES` set the connectors themselves fail closed on, so widening that set for a
 *    real integration updates this page in the same move rather than leaving it lying.
 *
 * 2. It degrades instead of throwing. Each check is independent and captures its own failure,
 *    because a diagnostics payload that 500s when one probe fails is useless precisely when
 *    something is wrong — which is the only time anyone opens it.
 */

import { getPrismaClient } from "@/lib/services/database/database";
import { checkSchemaDrift } from "./schema-drift";
import { registeredCountries, getTaxConnector } from "@/lib/tax/connectors/registry";
import { authorityName, modeKind } from "@/lib/tax/connectors/presentation";

/**
 * - `ok` — working as designed.
 * - `simulated` — deliberately not connected to anything. Informational, never a fault, and
 *   never rendered as success: "working" and "pretending" must not share a colour.
 * - `warning` — degraded or unconfigured, but the app runs.
 * - `error` — something is broken and user-visible.
 */
export type StatusSeverity = "ok" | "simulated" | "warning" | "error";

export interface StatusCheck {
  id: string;
  /** Grouping for the UI: infrastructure the instance runs on vs outside connections. */
  group: "platform" | "integration";
  severity: StatusSeverity;
  /** Short machine-ish state, translated in the UI ("in_sync", "simulated", "not_configured"). */
  state: string;
  /** Facts the operator needs, already safe to display. Never raw exception text. */
  detail?: string;
  /** What to do about it. Null when there is nothing to do. */
  remedy?: string;
}

export interface SystemStatus {
  generatedAt: string;
  checks: StatusCheck[];
  counts: Record<StatusSeverity, number>;
}

const envSet = (name: string) => Boolean(process.env[name]?.trim());

/**
 * Schema drift. First because it is the failure that hides behind every other symptom: a missing
 * column takes down `findMany` for the entire model, so unrelated pages break and the cause is
 * named only in a log line nobody is watching.
 */
async function schemaCheck(): Promise<StatusCheck> {
  const drift = await checkSchemaDrift();

  if (drift.error) {
    return {
      id: "schema",
      group: "platform",
      severity: "warning",
      state: "unknown",
      detail: drift.error,
      remedy: "The schema could not be compared against the database; see the server log.",
    };
  }

  if (drift.inSync) {
    return {
      id: "schema",
      group: "platform",
      severity: "ok",
      state: "in_sync",
      detail: `${drift.tablesChecked} tables checked.`,
    };
  }

  const missing = [...drift.missingTables, ...drift.missingColumns];
  return {
    id: "schema",
    group: "platform",
    severity: "error",
    state: "drifted",
    // Bounded: a schema that has never been pushed reports every table, and the point is to
    // show that it happened, not to print the schema back.
    detail: `Missing: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ` (+${missing.length - 8} more)` : ""}`,
    remedy:
      "Run `npx prisma db push`. Deployed instances do this on start unless AUTO_DB_SCHEMA_SYNC is off.",
  };
}

async function databaseCheck(): Promise<StatusCheck> {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return { id: "database", group: "platform", severity: "ok", state: "reachable" };
  } catch {
    // The reason is deliberately not echoed: this payload reaches a browser, and a Prisma
    // failure names tables, columns and file paths. It is logged by the caller instead.
    return {
      id: "database",
      group: "platform",
      severity: "error",
      state: "unreachable",
      remedy: "Check DATABASE_URL and that the SQLite file is readable; see the server log.",
    };
  }
}

function encryptionCheck(): StatusCheck {
  if (envSet("PII_ENCRYPTION_KEY")) {
    return { id: "pii", group: "platform", severity: "ok", state: "configured" };
  }
  // encryptPII returns plaintext without a key, so this is silent data exposure rather than a
  // crash. Production refuses to start without it unless ALLOW_UNENCRYPTED_PII is set.
  const waived = envSet("ALLOW_UNENCRYPTED_PII");
  return {
    id: "pii",
    group: "platform",
    severity: waived ? "error" : "warning",
    state: waived ? "waived" : "not_configured",
    detail: waived
      ? "ALLOW_UNENCRYPTED_PII is set: IBANs, NIFs and phone numbers are stored as plaintext."
      : undefined,
    remedy: "Set PII_ENCRYPTION_KEY to a 64-character hex value.",
  };
}

/** One row per country that has a connector, whether or not this user has configured it. */
async function taxChecks(userId: string): Promise<StatusCheck[]> {
  let rows: { country: string; mode: string; status: string; lastSubmissionAt: Date | null }[] = [];
  try {
    const prisma = getPrismaClient();
    rows = await prisma.taxAuthorityConnector.findMany({
      where: { userId },
      select: { country: true, mode: true, status: true, lastSubmissionAt: true },
    });
  } catch {
    return [
      {
        id: "tax",
        group: "integration",
        severity: "warning",
        state: "unknown",
        remedy: "Connector records could not be read; check the database status above.",
      },
    ];
  }

  return registeredCountries().map((country) => {
    const authority = authorityName(country);
    const row = rows.find((r) => r.country.toUpperCase() === country);
    const files = getTaxConnector(country)?.country === country;

    if (!row) {
      return {
        id: `tax:${country}`,
        group: "integration",
        severity: "simulated",
        state: "not_created",
        detail: `${authority}. No connector record yet — one is created on first use.`,
        remedy: files ? undefined : "No connector is registered for this country.",
      };
    }

    // An unsupported mode is an ERROR, not a note: the connector refuses every call and logs,
    // so the symptom is silence. Without this the operator has no way to learn why nothing
    // submits. Derived from the guard's own SIMULATED_MODES via modeKind().
    const unsupported = modeKind(row.mode) === "unsupported";

    return {
      id: `tax:${country}`,
      group: "integration",
      severity: unsupported ? "error" : "simulated",
      state: unsupported ? "mode_unsupported" : "simulated",
      detail: unsupported
        ? `${authority}. Mode "${row.mode}" is not supported — nothing is being submitted.`
        : `${authority}. Mode "${row.mode}" — filings are simulated and nothing is transmitted.` +
          (row.lastSubmissionAt
            ? ` Last call ${row.lastSubmissionAt.toISOString().slice(0, 10)}.`
            : ""),
      remedy: unsupported
        ? 'Set the connector mode back to "sandbox" or "review". No live endpoint exists yet.'
        : undefined,
    };
  });
}

async function bankCheck(userId: string): Promise<StatusCheck> {
  try {
    const prisma = getPrismaClient();
    const connections = await prisma.bankConnection.findMany({
      where: { userId },
      select: { provider: true, lastSyncAt: true },
    });
    const lastSync = connections
      .map((c) => c.lastSyncAt)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      id: "bank",
      group: "integration",
      severity: "simulated",
      state: "manual_only",
      detail:
        "Manual / CSV import only — no live bank connection exists." +
        (lastSync ? ` Last import ${lastSync.toISOString().slice(0, 10)}.` : " No imports yet."),
    };
  } catch {
    return {
      id: "bank",
      group: "integration",
      severity: "warning",
      state: "unknown",
      remedy: "Bank records could not be read; check the database status above.",
    };
  }
}

function emailCheck(): StatusCheck {
  return envSet("SENDGRID_API_KEY")
    ? { id: "email", group: "integration", severity: "ok", state: "configured" }
    : {
        id: "email",
        group: "integration",
        severity: "warning",
        state: "not_configured",
        detail: "Portal invitations and reminders will not be delivered.",
        remedy: "Set SENDGRID_API_KEY.",
      };
}

function billingCheck(): StatusCheck {
  if (!envSet("STRIPE_SECRET_KEY")) {
    return {
      id: "billing",
      group: "integration",
      severity: "ok",
      state: "disabled",
      // Not a fault. Self-hosted instances are unlimited by design, so an absent Stripe key is
      // the expected configuration rather than something to fix.
      detail: "No Stripe key — subscription billing is off and plan limits are not enforced.",
    };
  }

  const missing = ["STRIPE_PRICE_ID_PRO", "STRIPE_PRICE_ID_BUSINESS"].filter((v) => !envSet(v));
  return missing.length === 0
    ? { id: "billing", group: "integration", severity: "ok", state: "configured" }
    : {
        id: "billing",
        group: "integration",
        severity: "warning",
        state: "incomplete",
        detail: `Stripe is configured but ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} missing.`,
        remedy: "Checkout will fail for the affected plans until these are set.",
      };
}

/**
 * The signed-in user's own row. Sessions are JWTs and Google OAuth has no PrismaAdapter, so the
 * id every owned record foreign-keys against is written into the token once, at sign-in. Sign in
 * while the database is unreachable and the token can end up carrying the OAuth provider's id
 * instead: the app then loads normally, every list comes back empty, and every save dies with a
 * raw Prisma foreign-key error naming a constraint rather than a cause. Worth a check precisely
 * because the symptom points nowhere near it.
 */
async function sessionUserCheck(userId: string): Promise<StatusCheck> {
  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (user) {
      return { id: "session_user", group: "platform", severity: "ok", state: "resolved" };
    }

    return {
      id: "session_user",
      group: "platform",
      severity: "error",
      state: "orphaned",
      detail: "This session identifies a user record that does not exist in the database.",
      remedy:
        "Sign out and sign in again. The account is reprovisioned on sign-in; until then reads " +
        "return nothing and every save fails.",
    };
  } catch {
    return {
      id: "session_user",
      group: "platform",
      severity: "warning",
      state: "unknown",
      detail: "The user record could not be read.",
      remedy: "See the database check above.",
    };
  }
}

export async function getSystemStatus(userId: string): Promise<SystemStatus> {
  // Independent probes, gathered together. allSettled rather than all: one failing check must
  // not remove the other nine from the page.
  const results = await Promise.allSettled([
    schemaCheck(),
    databaseCheck(),
    sessionUserCheck(userId),
    taxChecks(userId),
    bankCheck(userId),
  ]);

  const checks: StatusCheck[] = [encryptionCheck(), emailCheck(), billingCheck()];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    if (Array.isArray(result.value)) checks.push(...result.value);
    else checks.push(result.value);
  }

  const order: Record<StatusSeverity, number> = { error: 0, warning: 1, simulated: 2, ok: 3 };
  checks.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));

  const counts: Record<StatusSeverity, number> = { ok: 0, simulated: 0, warning: 0, error: 0 };
  for (const check of checks) counts[check.severity] += 1;

  return { generatedAt: new Date().toISOString(), checks, counts };
}
