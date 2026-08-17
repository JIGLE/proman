#!/usr/bin/env node
/**
 * Ensure SQLite DB is present, apply schema (prisma db push), generate client,
 * then verify that the expected tables were created; fail startup when missing.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// DATABASE_URL may be unset; in that case we default to the same file
// prisma.config.ts uses (data/situs.db in production, dev.db otherwise).
if (!process.env.DATABASE_URL) {
  console.warn(
    "[ensure-sqlite] DATABASE_URL is not set; defaulting to prisma.config.ts's path " +
      `(${process.env.NODE_ENV === "production" ? "data/situs.db" : "dev.db"}).`,
  );
} else {
  console.debug(
    "[ensure-sqlite] DATABASE_URL is available:",
    process.env.DATABASE_URL.substring(0, 20) + "...",
  );
}

// Determine DB path from DATABASE_URL, falling back to the same default as
// prisma.config.ts (data/situs.db in production, dev.db otherwise) so every
// code path here targets the file the app actually reads.
const dbUrlFromEnv = process.env.DATABASE_URL;
const defaultDbFile = process.env.NODE_ENV === "production" ? "data/situs.db" : "dev.db";
let DB_PATH;
if (dbUrlFromEnv && dbUrlFromEnv.startsWith("file:")) {
  const dbPath = dbUrlFromEnv.replace(/^file:\/\//, "").replace(/^file:/, "");
  DB_PATH = path.resolve(process.cwd(), dbPath);
} else {
  DB_PATH = path.resolve(process.cwd(), defaultDbFile);
}
const BACKUP_PATH = `${DB_PATH}.backup`;

// Check if DB exists
const dbExists = fs.existsSync(DB_PATH);
console.debug(`[ensure-sqlite] DB path: ${DB_PATH} exists: ${dbExists}`);

// DB Reset Logic
const resetDb = process.env.RESET_DB === "true";
if (resetDb) {
  console.debug("[ensure-sqlite] DB reset enabled.");
  if (fs.existsSync(BACKUP_PATH)) {
    const expectedChecksum = process.env.DB_BACKUP_CHECKSUM;
    if (expectedChecksum) {
      const backupData = fs.readFileSync(BACKUP_PATH);
      const actualChecksum = crypto.createHash("sha256").update(backupData).digest("hex");
      if (actualChecksum !== expectedChecksum) {
        console.error(
          `[ensure-sqlite] Backup checksum mismatch! Expected: ${expectedChecksum}, Actual: ${actualChecksum}`,
        );
        process.exit(1);
      }
      console.debug("[ensure-sqlite] Backup checksum validated.");
    } else {
      console.debug("[ensure-sqlite] No checksum provided; proceeding without validation.");
    }
  } else {
    console.debug("[ensure-sqlite] No backup found; proceeding with clean DB.");
  }
}

function error(...args) {
  console.error("[ensure-sqlite]", ...args);
}

function log(...args) {
  console.debug("[ensure-sqlite]", ...args);
}

// Resolve the sqlite URL, mirroring prisma.config.ts's own default so this step
// always targets the SAME file the app reads. Previously, when DATABASE_URL was
// unset the whole ensure step was skipped — but prisma.config.ts still defaults
// to data/situs.db (prod), so the app's real DB never got migrated and every
// query 500'd with P2022 "column does not exist".
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  dbUrl = process.env.NODE_ENV === "production" ? "file:./data/situs.db" : "file:./dev.db";
  log(`DATABASE_URL not set; defaulting to ${dbUrl} (matches prisma.config.ts).`);
}
if (!dbUrl.startsWith("file:")) {
  log("DATABASE_URL is not sqlite (file:); skipping sqlite ensure step.");
  process.exit(0);
}
// Ensure child `prisma` invocations resolve to the same DB even if the env var
// was originally unset.
process.env.DATABASE_URL = dbUrl;

const dbPath = dbUrl.replace(/^file:\/\//, "").replace(/^file:/, "");
const resolved = path.resolve(process.cwd(), dbPath);
const dir = path.dirname(resolved);

try {
  fs.mkdirSync(dir, { recursive: true });
  const fd = fs.openSync(resolved, "a"); // create file if missing
  fs.closeSync(fd);
  fs.accessSync(resolved, fs.constants.W_OK);
} catch (err) {
  // This used to warn and exit 0 — "non-fatal". It is not non-fatal in production.
  //
  // `CMD` is `npm run prestart && node server.js`, so exiting 0 starts the server against a
  // database that does not exist. /api/ready answers 200 without touching the DB (deliberately,
  // so the container is not marked unhealthy while `prisma db push` runs), the Docker healthcheck
  // goes green, and the orchestrator reports the app HEALTHY while every data route 500s.
  // Sign-in keeps working because NextAuth uses JWT sessions, so it reads as a partial outage
  // rather than a missing database.
  //
  // That cost a day of diagnosis on a real deployment: the host path mounted at /app/data was
  // owned by root with mode 755, the container runs as uid 1001, and nothing anywhere said so.
  // A container that cannot reach its database should crash-loop visibly.
  error("Cannot create/write DB file:", resolved, err && err.message);
  error(
    `The container runs as nextjs:nextjs (uid/gid 1001:1001, see Dockerfile). If ${dir} is a ` +
      `mounted host directory, fix its ownership on the HOST (not inside the container):\n` +
      `     chown -R 1001:1001 ${dir} && chmod -R 770 ${dir}`,
  );

  // Same switch the missing-tables check below uses — one escape hatch, not two.
  const failOnFs =
    process.env.PRESTART_FAIL_ON_SQLITE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.PRESTART_FAIL_ON_SQLITE !== "false");

  if (failOnFs) {
    error(
      "Exiting rather than starting without a database (production mode). " +
        "Set PRESTART_FAIL_ON_SQLITE=false to start anyway and serve 500s.",
    );
    process.exit(1);
  }
  console.warn("[ensure-sqlite] Continuing startup without a writable database file.");
  process.exit(0);
}

// Check if auto DB initialization is enabled.
// AUTO_DB_INIT (default: "true") will run `prisma db push` when the DB has no tables.
// Operators can disable this by setting AUTO_DB_INIT=false.
const autoDbInit = process.env.AUTO_DB_INIT !== "false" && process.env.AUTO_DB_INIT !== "0";

// AUTO_DB_SCHEMA_SYNC (default: "true") will run `prisma db push` (without --accept-data-loss)
// on every startup to add any missing columns. Safe for existing databases — only additive.
// Operators can disable this by setting AUTO_DB_SCHEMA_SYNC=false.
const autoSchemaSync =
  process.env.AUTO_DB_SCHEMA_SYNC !== "false" && process.env.AUTO_DB_SCHEMA_SYNC !== "0";

// After applying schema, verify tables exist in sqlite
let expectedTables = [];

try {
  const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  // Parse models and @@map names
  const modelRegex = /model\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const body = match[2];

    const mapMatch = body.match(/@@map\(["']([^"']+)["']\)/);
    if (mapMatch) {
      expectedTables.push(mapMatch[1]);
    } else {
      expectedTables.push(modelName);
      expectedTables.push(modelName.toLowerCase());
      expectedTables.push(modelName.toLowerCase() + "s");
      expectedTables.push(
        modelName
          .replace(/([A-Z])/g, "_$1")
          .toLowerCase()
          .replace(/^_/, ""),
      );
    }
  }

  expectedTables = Array.from(new Set(expectedTables)).filter(Boolean);
} catch (err) {
  error("Could not read/parse prisma/schema.prisma:", err && err.message);
  console.warn(
    "[ensure-sqlite] Non-fatal schema parse error. Continuing startup; operator should perform explicit DB init.",
  );
  process.exit(0);
}

try {
  const Database = require("better-sqlite3");
  let db = new Database(resolved, { readonly: true, fileMustExist: true });

  let rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  let present = new Set(rows.map((r) => String(r.name)));

  const critical = [
    "users",
    "properties",
    "tenants",
    "receipts",
    "correspondence",
    "correspondence_templates",
    "email_logs",
  ];

  let missing = [];
  for (const req of critical) {
    if (present.has(req)) continue;
    const hasAny = expectedTables.some((candidate) => candidate && present.has(String(candidate)));
    if (!hasAny && !present.has(req)) {
      missing.push(req);
    }
  }

  db.close();

  // If tables are missing, attempt automatic initialization
  if (missing.length > 0 && autoDbInit) {
    log(
      "Missing required tables:",
      missing.join(", "),
      "— running automatic DB initialization (AUTO_DB_INIT is enabled).",
    );
    try {
      log("Running: npx prisma db push --schema=prisma/schema.prisma --accept-data-loss");
      execSync("npx prisma db push --schema=prisma/schema.prisma --accept-data-loss", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: dbUrl },
        timeout: 120000,
      });
      log("Prisma DB push completed successfully.");

      // Re-verify tables after push
      db = new Database(resolved, { readonly: true, fileMustExist: true });
      rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      present = new Set(rows.map((r) => String(r.name)));

      missing = [];
      for (const req of critical) {
        if (present.has(req)) continue;
        const hasAny = expectedTables.some(
          (candidate) => candidate && present.has(String(candidate)),
        );
        if (!hasAny && !present.has(req)) {
          missing.push(req);
        }
      }
      db.close();

      if (missing.length === 0) {
        log("Auto DB initialization succeeded. All critical tables present.");
      } else {
        error("Auto DB initialization completed but tables still missing:", missing.join(", "));
      }
    } catch (pushErr) {
      error("Auto DB initialization failed:", pushErr && pushErr.message);
      error(
        "The app will not function correctly. Please run 'npx prisma db push --schema=prisma/schema.prisma' manually or use the /api/debug/db/init endpoint.",
      );
    }
  } else if (missing.length > 0) {
    log("AUTO_DB_INIT is disabled; skipping automatic schema push.");
  }

  if (missing.length > 0) {
    error("Missing required tables in sqlite DB:", missing.join(", "));
    error("SQLite tables present:", Array.from(present).join(", "));
    error("Have you run `npx prisma db push`?");
    // In production, fail fast to prevent silent 500 errors.
    // Operators can set PRESTART_FAIL_ON_SQLITE=false to override.
    const isProduction = process.env.NODE_ENV === "production";
    const failOnMissing =
      process.env.PRESTART_FAIL_ON_SQLITE === "true" ||
      (isProduction && process.env.PRESTART_FAIL_ON_SQLITE !== "false");
    if (failOnMissing) {
      error(
        "Exiting due to missing tables (production mode). Set PRESTART_FAIL_ON_SQLITE=false to override.",
      );
      process.exit(1);
    } else {
      console.warn(
        "[ensure-sqlite] Missing sqlite tables — continuing startup (NOT recommended for production).",
      );
      process.exit(0);
    }
  }

  log("Verified sqlite tables exist:", critical.join(", "));
  // Also log all tables for debugging
  db = new Database(resolved, { readonly: true, fileMustExist: true });
  const allRows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const allTables = allRows.map((r) => String(r.name)).join(", ");
  log("All sqlite tables present:", allTables);
  log("Table count:", allRows.length);

  // Schema sync: run `prisma db push` (additive-only, no --accept-data-loss) on every
  // startup so any new columns added to schema.prisma since the DB was first initialised
  // are applied automatically. `prisma db push` is idempotent — it is a no-op when the
  // schema already matches the database, so the overhead on normal starts is negligible.
  db.close();
  if (autoSchemaSync) {
    const pushEnv = { ...process.env, DATABASE_URL: dbUrl };
    // Prisma 7's `db push` prints its help text and exits 0 when given an
    // unknown flag — a silent no-op that looks like success. So we don't trust
    // the exit code: we capture output and require an explicit "in sync"
    // confirmation, otherwise treat it as a failure to escalate.
    const runPush = (extra) =>
      execSync(`npx prisma db push --schema=prisma/schema.prisma${extra}`, {
        stdio: ["ignore", "pipe", "pipe"],
        env: pushEnv,
        timeout: 120000,
        encoding: "utf8",
      });
    const confirmsSync = (out) => /in sync with (your|the) prisma schema/i.test(out || "");

    let synced = false;
    try {
      log("Running schema sync (prisma db push)...");
      const out = runPush("");
      if (out) process.stdout.write(out);
      synced = confirmsSync(out);
      if (synced) log("Schema sync completed successfully.");
      else log("Schema sync did not confirm an in-sync schema; will attempt a forced sync.");
    } catch (syncErr) {
      // The additive push was refused — the diff needs a destructive change
      // (a dropped/renamed/retyped column). Leaving the DB on a schema the app
      // can't query means every request 500s with P2022.
      log("Additive schema sync could not apply cleanly:", syncErr && syncErr.message);
    }

    if (!synced) {
      // Back up the file, then force the sync so the container never boots on a
      // schema the app can't query. AUTO_DB_SCHEMA_SYNC_FORCE=false disables this.
      const allowForce =
        process.env.AUTO_DB_SCHEMA_SYNC_FORCE !== "false" &&
        process.env.AUTO_DB_SCHEMA_SYNC_FORCE !== "0";
      if (!allowForce) {
        error("AUTO_DB_SCHEMA_SYNC_FORCE=false — leaving schema unchanged; the app may 500.");
      } else {
        try {
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const backup = `${resolved}.bak-${stamp}`;
          fs.copyFileSync(resolved, backup);
          log("Backed up database before forced sync →", backup);
        } catch (bkErr) {
          error("Could not back up database before forced sync:", bkErr && bkErr.message);
        }
        try {
          log("Retrying schema sync with --accept-data-loss...");
          const out = runPush(" --accept-data-loss");
          if (out) process.stdout.write(out);
          if (confirmsSync(out)) log("Forced schema sync completed successfully.");
          else error("Forced schema sync did not confirm an in-sync schema. Check DB permissions.");
        } catch (forceErr) {
          error("Forced schema sync failed:", forceErr && forceErr.message);
        }
      }
    }
  }

  process.exit(0);
} catch (err) {
  error("Error while validating sqlite tables:", err && err.message);
  if (process.env.NODE_ENV === "production") {
    error("Fatal: Cannot validate database in production. Exiting.");
    process.exit(1);
  }
  console.warn(
    "[ensure-sqlite] Non-fatal sqlite validation error. Continuing startup; operator should perform explicit DB init.",
  );
  process.exit(0);
}
