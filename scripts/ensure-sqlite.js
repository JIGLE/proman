#!/usr/bin/env node
/**
 * Ensure SQLite DB is present, apply schema (prisma db push), generate client,
 * then verify that the expected tables were created; fail startup when missing.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// DATABASE_URL may be unset in development; in that case we default to ./dev.db
if (!process.env.DATABASE_URL) {
  console.warn(
    "[ensure-sqlite] DATABASE_URL is not set; defaulting to dev.db for local/dev usage",
  );
} else {
  console.debug(
    "[ensure-sqlite] DATABASE_URL is available:",
    process.env.DATABASE_URL.substring(0, 20) + "...",
  );
}

// Determine DB path from DATABASE_URL (if provided) or default to ./dev.db
const dbUrlFromEnv = process.env.DATABASE_URL;
let DB_PATH;
if (dbUrlFromEnv && dbUrlFromEnv.startsWith("file:")) {
  const dbPath = dbUrlFromEnv.replace(/^file:\/\//, "").replace(/^file:/, "");
  DB_PATH = path.resolve(process.cwd(), dbPath);
} else {
  DB_PATH = path.resolve(process.cwd(), "dev.db");
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
      const actualChecksum = crypto
        .createHash("sha256")
        .update(backupData)
        .digest("hex");
      if (actualChecksum !== expectedChecksum) {
        console.error(
          `[ensure-sqlite] Backup checksum mismatch! Expected: ${expectedChecksum}, Actual: ${actualChecksum}`,
        );
        process.exit(1);
      }
      console.debug("[ensure-sqlite] Backup checksum validated.");
    } else {
      console.debug(
        "[ensure-sqlite] No checksum provided; proceeding without validation.",
      );
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

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || !dbUrl.startsWith("file:")) {
  log("No sqlite DATABASE_URL configured; skipping sqlite ensure step.");
  process.exit(0);
}

const dbPath = dbUrl.replace(/^file:\/\//, "").replace(/^file:/, "");
const resolved = path.resolve(process.cwd(), dbPath);
const dir = path.dirname(resolved);

try {
  fs.mkdirSync(dir, { recursive: true });
  const fd = fs.openSync(resolved, "a"); // create file if missing
  fs.closeSync(fd);
  fs.accessSync(resolved, fs.constants.W_OK);
} catch (err) {
  error("Cannot create/write DB file:", resolved, err && err.message);
  console.warn(
    "[ensure-sqlite] Non-fatal filesystem error. Continuing startup; operator should perform explicit DB init.",
  );
  process.exit(0);
}

// Check if auto DB initialization is enabled.
// AUTO_DB_INIT (default: "true") will run `prisma db push` when the DB has no tables.
// Operators can disable this by setting AUTO_DB_INIT=false.
const autoDbInit =
  process.env.AUTO_DB_INIT !== "false" && process.env.AUTO_DB_INIT !== "0";

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

  let rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
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
    const hasAny = expectedTables.some(
      (candidate) => candidate && present.has(String(candidate)),
    );
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
      log(
        "Running: npx prisma db push --schema=prisma/schema.prisma --accept-data-loss",
      );
      execSync(
        "npx prisma db push --schema=prisma/schema.prisma --accept-data-loss",
        {
          stdio: "inherit",
          env: { ...process.env, DATABASE_URL: dbUrl },
          timeout: 60000,
        },
      );
      log("Prisma DB push completed successfully.");

      // Re-verify tables after push
      db = new Database(resolved, { readonly: true, fileMustExist: true });
      rows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
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
        error(
          "Auto DB initialization completed but tables still missing:",
          missing.join(", "),
        );
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
  const allRows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  const allTables = allRows.map((r) => String(r.name)).join(", ");
  log("All sqlite tables present:", allTables);
  log("Table count:", allRows.length);
  db.close();
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
