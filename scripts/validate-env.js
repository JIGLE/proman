#!/usr/bin/env node

/**
 * Environment variable validation script for ProMan.
 *
 * Run before starting the application to ensure all required
 * environment variables are set. Usable from CI and package.json scripts.
 *
 * Usage:
 *   node scripts/validate-env.js          # validates for current NODE_ENV
 *   node scripts/validate-env.js --strict # exits non-zero on warnings too
 */

const strict = process.argv.includes("--strict");

// ── helpers ──────────────────────────────────────────────────────────────
const errors = [];
const warnings = [];

function requireVar(name, message) {
  if (!process.env[name]) {
    errors.push(`  ✗ ${name} — ${message}`);
  }
}

function warnVar(name, message) {
  if (!process.env[name]) {
    warnings.push(`  ⚠ ${name} — ${message}`);
  }
}

function requireVarIf(condition, name, message) {
  if (condition && !process.env[name]) {
    errors.push(`  ✗ ${name} — ${message}`);
  }
}

// ── validation rules ─────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === "production";
const oauthEnabled = process.env.ENABLE_OAUTH === "true";

// Always required
requireVar(
  "NEXTAUTH_URL",
  "Full URL where the app is hosted (e.g. https://your.domain.com)",
);

// Required in production
if (isProd) {
  requireVar(
    "NEXTAUTH_SECRET",
    "Session signing secret (min 32 chars). Generate: openssl rand -base64 32",
  );
  requireVar(
    "DATABASE_URL",
    "Database connection string (e.g. file:/data/proman.sqlite)",
  );
}

// NEXTAUTH_SECRET length check
if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
  warnings.push(
    "  ⚠ NEXTAUTH_SECRET — should be at least 32 characters for security",
  );
}

// OAuth credentials
requireVarIf(
  oauthEnabled,
  "GOOGLE_CLIENT_ID",
  "Required when ENABLE_OAUTH=true",
);
requireVarIf(
  oauthEnabled,
  "GOOGLE_CLIENT_SECRET",
  "Required when ENABLE_OAUTH=true",
);

// Non-critical services
warnVar("SENDGRID_API_KEY", "Email sending will be disabled");
warnVar("FROM_EMAIL", "Defaults to noreply@proman.app");

// CSRF secret recommended in production
if (isProd) {
  warnVar(
    "CSRF_SECRET",
    "CSRF protection secret; falls back to NEXTAUTH_SECRET",
  );
}

// ── output ───────────────────────────────────────────────────────────────
console.log("");
console.log("🔍 ProMan Environment Validation");
console.log(`   NODE_ENV = ${process.env.NODE_ENV || "(unset)"}`);
console.log("");

if (warnings.length > 0) {
  console.log("Warnings:");
  warnings.forEach((w) => console.log(w));
  console.log("");
}

if (errors.length > 0) {
  console.log("Errors:");
  errors.forEach((e) => console.log(e));
  console.log("");
  console.error(
    `❌ ${errors.length} required variable(s) missing. Fix the above before starting.`,
  );
  process.exit(1);
}

if (strict && warnings.length > 0) {
  console.error(`❌ ${warnings.length} warning(s) found in --strict mode.`);
  process.exit(1);
}

console.log("✅ Environment looks good.\n");
