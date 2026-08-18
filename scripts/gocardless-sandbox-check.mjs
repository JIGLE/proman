#!/usr/bin/env node
/**
 * Record what GoCardless actually returns.
 *
 * WHY THIS EXISTS. `lib/services/bank/providers/gocardless.ts` was written against the API as
 * described, and its 23 unit tests assert *those assumptions* by feeding a mocked `fetch` the
 * shapes the author expected. If an assumption is wrong, every test still passes and the
 * integration fails on first contact with the real endpoint. That is the one failure mode mocked
 * tests structurally cannot catch, so it needs one real call.
 *
 * Run it anywhere with egress to bankaccountdata.gocardless.com:
 *
 *   GOCARDLESS_SECRET_ID=... GOCARDLESS_SECRET_KEY=... node scripts/gocardless-sandbox-check.mjs
 *
 * It walks token → institutions(PT) → agreement → requisition against the sandbox institution and
 * writes every raw response to stdout as JSON. Nothing is invented: what it prints is what came
 * back. Paste the output back and it becomes the fixture set for the end-to-end suite, which turns
 * this one-time check into a permanent regression test.
 *
 * REDACTION. Secrets, bearer tokens and IBANs are masked before printing, so the output is safe to
 * paste into a chat or attach to a PR. Account ids and requisition ids are NOT masked — they are
 * scoped to a sandbox institution and are needed to read the transcript. Do not run this against a
 * real bank connection and paste the result.
 *
 * IT STOPS BEFORE AUTHORISATION. Creating a requisition returns a link a human must open in a
 * browser to grant consent; a script cannot complete that. Steps 1-4 are automatic and already
 * cover the shapes most likely to be wrong. Steps 5-6 (accounts, transactions) need the link
 * visited first — pass the requisition id back in with --requisition=<id> for a second pass.
 */

const API_BASE =
  process.env.GOCARDLESS_API_BASE?.replace(/\/+$/, "") ||
  "https://bankaccountdata.gocardless.com/api/v2";

/** The sandbox institution: a real API call against test data, not a mock. */
const SANDBOX_INSTITUTION = "SANDBOXFINANCE_SFIN0000";

const args = process.argv.slice(2);
const requisitionArg = args.find((a) => a.startsWith("--requisition="))?.split("=")[1];

const secretId = process.env.GOCARDLESS_SECRET_ID;
const secretKey = process.env.GOCARDLESS_SECRET_KEY;

if (!secretId || !secretKey) {
  console.error(
    "Set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY.\n" +
      "Free credentials: https://bankaccountdata.gocardless.com/user-secrets/",
  );
  process.exit(1);
}

/** Mask anything that must not leave the machine that ran this. */
function redact(value) {
  if (value === null || typeof value !== "object") {
    if (typeof value !== "string") return value;
    // IBANs: keep the country and last 4 so shape is still visible, drop the rest.
    return value.replace(/\b([A-Z]{2})\d{2}[A-Z0-9]{6,26}\b/g, (m, cc) => `${cc}..${m.slice(-4)}`);
  }
  if (Array.isArray(value)) return value.map(redact);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (/^(access|refresh|secret_id|secret_key)$/i.test(k)) {
      out[k] = typeof v === "string" ? `<redacted ${v.length} chars>` : "<redacted>";
    } else if (/iban/i.test(k) && typeof v === "string") {
      out[k] = `${v.slice(0, 2)}..${v.slice(-4)}`;
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}

let token = null;
const transcript = [];

async function call(label, path, init) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  };

  let res, bodyText;
  try {
    res = await fetch(url, { ...init, headers });
    bodyText = await res.text();
  } catch (err) {
    // A network failure is a result too — it is how "the host is blocked" shows up.
    transcript.push({ step: label, path, error: String(err) });
    console.error(`  ✖ ${label}: ${err}`);
    return null;
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { __unparsed: bodyText.slice(0, 500) };
  }

  transcript.push({ step: label, path, status: res.status, body: redact(body) });
  console.error(`  ${res.ok ? "✓" : "✖"} ${label} → HTTP ${res.status}`);
  return res.ok ? body : null;
}

async function main() {
  console.error(`\nRecording GoCardless responses from ${API_BASE}\n`);

  // 1. Token. Confirms the auth shape and whether `access_expires` is really seconds.
  const auth = await call("token", "/token/new/", {
    method: "POST",
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });
  if (!auth?.access) {
    console.error("\nAuthentication failed — nothing further can be checked.\n");
    dump();
    process.exit(1);
  }
  token = auth.access;

  // 2. Institutions for PT. The adapter reads `transaction_total_days` off these; if that field
  //    is named differently the history window silently becomes undefined.
  const institutions = await call("institutions(PT)", "/institutions/?country=pt");
  if (Array.isArray(institutions)) {
    const sandbox = institutions.find((i) => i.id === SANDBOX_INSTITUTION);
    transcript.push({
      step: "institutions(PT) summary",
      count: institutions.length,
      sandboxPresent: Boolean(sandbox),
      sample: redact(institutions.slice(0, 2)),
    });
  }

  // 3. End-user agreement. Checks `access_scope` is accepted as sent and what comes back.
  const agreement = await call("agreement", "/agreements/enduser/", {
    method: "POST",
    body: JSON.stringify({
      institution_id: SANDBOX_INSTITUTION,
      max_historical_days: 90,
      access_valid_for_days: 90,
      access_scope: ["details", "transactions"],
    }),
  });

  // 4. Requisition. Returns the link a human must visit, and the initial status.
  let requisitionId = requisitionArg;
  if (!requisitionId && agreement?.id) {
    const requisition = await call("requisition", "/requisitions/", {
      method: "POST",
      body: JSON.stringify({
        redirect: "https://example.invalid/api/bank/connections/callback",
        institution_id: SANDBOX_INSTITUTION,
        agreement: agreement.id,
        reference: `contract-check-${Date.now()}`,
      }),
    });
    requisitionId = requisition?.id;
    if (requisition?.link) {
      console.error(`\n  ▸ Open this to grant sandbox consent, then re-run with:`);
      console.error(
        `      node scripts/gocardless-sandbox-check.mjs --requisition=${requisitionId}`,
      );
      console.error(`    ${requisition.link}\n`);
    }
  }

  // 5-6. Only reachable once a human has visited the link above.
  if (requisitionId) {
    const req = await call("requisition(get)", `/requisitions/${requisitionId}/`);
    const accountId = req?.accounts?.[0];
    if (accountId) {
      await call("account details", `/accounts/${accountId}/details/`);
      await call("transactions", `/accounts/${accountId}/transactions/`);
    } else {
      console.error("  … no accounts yet: the consent link has not been completed.");
    }
  }

  dump();
}

function dump() {
  console.error("\n──────── paste everything below this line ────────\n");
  console.log(
    JSON.stringify(
      { apiBase: API_BASE, recordedAt: new Date().toISOString(), transcript },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  dump();
  process.exit(1);
});
