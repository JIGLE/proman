#!/usr/bin/env node
/**
 * Ensure SQLite DB is present, apply schema (prisma db push), generate client,
 * then verify that the expected tables were created; fail startup when missing.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Determine DB path from DATABASE_URL (if provided) or default to ./dev.db
const dbUrlFromEnv = process.env.DATABASE_URL;
let DB_PATH
if (dbUrlFromEnv && dbUrlFromEnv.startsWith('file:')) {
  const dbPath = dbUrlFromEnv.replace(/^file:\/\//, '').replace(/^file:/, '');
  DB_PATH = path.resolve(process.cwd(), dbPath);
} else {
  DB_PATH = path.resolve(process.cwd(), 'dev.db');
}
const BACKUP_PATH = `${DB_PATH}.backup`;

// Check if DB exists
const dbExists = fs.existsSync(DB_PATH);
console.log(`[ensure-sqlite] DB path: ${DB_PATH} exists: ${dbExists}`);

// DB Reset Logic
const resetDb = process.env.RESET_DB === 'true';
if (resetDb) {
  console.log('[ensure-sqlite] DB reset enabled.');
  if (fs.existsSync(BACKUP_PATH)) {
    const expectedChecksum = process.env.DB_BACKUP_CHECKSUM;
    if (expectedChecksum) {
      const backupData = fs.readFileSync(BACKUP_PATH);
      const actualChecksum = crypto.createHash('sha256').update(backupData).digest('hex');
      if (actualChecksum !== expectedChecksum) {
        console.error(`[ensure-sqlite] Backup checksum mismatch! Expected: ${expectedChecksum}, Actual: ${actualChecksum}`);
        process.exit(1);
      }
      console.log('[ensure-sqlite] Backup checksum validated.');
    } else {
      console.log('[ensure-sqlite] No checksum provided; proceeding without validation.');
    }
  } else {
    console.log('[ensure-sqlite] No backup found; proceeding with clean DB.');
  }
}

function error(...args) {
  console.error('[ensure-sqlite]', ...args);
}

function log(...args) {
  console.log('[ensure-sqlite]', ...args);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || !dbUrl.startsWith('file:')) {
  log('No sqlite DATABASE_URL configured; skipping sqlite ensure step.');
  process.exit(0);
}

const dbPath = dbUrl.replace(/^file:\/\//, '').replace(/^file:/, '');
const resolved = path.resolve(process.cwd(), dbPath);
const dir = path.dirname(resolved);

try {
  fs.mkdirSync(dir, { recursive: true });
  const fd = fs.openSync(resolved, 'a'); // create file if missing
  fs.closeSync(fd);
  fs.accessSync(resolved, fs.constants.W_OK);
} catch (err) {
  error('Cannot create/write DB file:', resolved, err && err.message);
  process.exit(1);
}

try {
  log('Applying Prisma schema (db push) and generating client...');
  // Run db push and generate. Let the outputs stream to stdout/stderr so containers show logs.
  const pushCommand = resetDb ? 'npx prisma db push --accept-data-loss' : 'npx prisma db push';
  execSync(pushCommand, { stdio: 'inherit' });
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (err) {
  error('Error preparing sqlite DB (prisma commands failed):', err && err.message);
  process.exit(1);
}

// After applying schema, verify tables exist in sqlite
let expectedTables = [];

try {
  const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

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
      expectedTables.push(modelName.toLowerCase() + 's');
      expectedTables.push(modelName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''));
    }
  }

  expectedTables = Array.from(new Set(expectedTables)).filter(Boolean);
} catch (err) {
  error('Could not read/parse prisma/schema.prisma:', err && err.message);
  process.exit(1);
}

try {
  const Database = require('better-sqlite3');
  const db = new Database(resolved, { readonly: true, fileMustExist: true });

  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const present = new Set(rows.map(r => String(r.name)));

  const critical = [
    'users',
    'properties',
    'tenants',
    'receipts',
    'correspondence',
    'correspondence_templates',
    'email_logs',
  ];

  const missing = [];
  for (const req of critical) {
    if (present.has(req)) continue;
    const hasAny = expectedTables.some(candidate => candidate && present.has(String(candidate)));
    if (!hasAny && !present.has(req)) {
      missing.push(req);
    }
  }

  if (missing.length > 0) {
    error('Missing required tables in sqlite DB:', missing.join(', '));
    error('SQLite tables present:', Array.from(present).join(', '));
    error('Have you run `npx prisma db push`? Container will exit to avoid running with incomplete schema.');
    process.exit(1);
  }

  log('Verified sqlite tables exist:', critical.join(', '));
  // Also log all tables for debugging
  const allRows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const allTables = allRows.map(r => String(r.name)).join(', ');
  log('All sqlite tables present:', allTables);
  db.close();
  process.exit(0);
} catch (err) {
  error('Error while validating sqlite tables:', err && err.message);
  process.exit(1);
}
