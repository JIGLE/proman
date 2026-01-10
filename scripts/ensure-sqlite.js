#!/usr/bin/env node
/**
 * Ensure SQLite DB is present, apply schema (prisma db push), generate client,
 * then verify that the expected tables were created; fail startup when missing.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(...args) {
  console.log('[ensure-sqlite]', ...args);
}

function error(...args) {
  console.error('[ensure-sqlite]', ...args);
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
  execSync('npx prisma db push', { stdio: 'inherit' });
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
  db.close();
  process.exit(0);
} catch (err) {
  error('Error while validating sqlite tables:', err && err.message);
  process.exit(1);
}