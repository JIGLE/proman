#!/usr/bin/env node
/**
 * Prestart orchestrator: runs optional prestart checks conditionally.
 * - SKIP_PRESTART=true  -> skip all checks
 * - PRESTART_CHECK_HOSTPORT=true -> enforce host/port validation
 * - If DATABASE_URL indicates sqlite (file:) then run ensure-sqlite, otherwise skip sqlite ensure step
 */

if (process.env.SKIP_PRESTART === "true") {
  console.log("[prestart] SKIP_PRESTART=true; skipping prestart checks.");
  process.exit(0);
}

// Run environment variable validation
try {
  require("./validate-env");
} catch (err) {
  // validate-env calls process.exit(1) on failure, so this catch
  // only fires for unexpected errors (syntax, missing file, etc.)
  console.error("[prestart] validate-env error:", err && err.message);
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

// Optionally run host/port check (will be non-fatal unless PRESTART_CHECK_HOSTPORT=true)
try {
  require("./check-hostport");
} catch (err) {
  console.warn("[prestart] check-hostport failed:", err && err.message);
}

// Only run sqlite ensure when DATABASE_URL suggests sqlite
const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.startsWith("file:")) {
  console.log("[prestart] SQLite mode detected. Running database checks...");
  try {
    require("./ensure-sqlite");
  } catch (err) {
    console.error("[prestart] ensure-sqlite failed:", err && err.message);
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[prestart] FATAL: Database initialization failed in production. " +
          "The app will NOT start correctly. Check permissions on the data directory " +
          "and ensure DATABASE_URL points to a writable path.",
      );
      process.exit(1);
    }
    console.warn(
      "[prestart] Continuing startup despite sqlite prestart failure; operator should run one-shot DB init.",
    );
  }
} else {
  console.log(
    "[prestart] DATABASE_URL does not indicate sqlite; skipping sqlite ensure step.",
  );
}

console.log("[prestart] Prestart checks complete.");
process.exit(0);
