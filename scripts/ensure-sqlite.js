#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure script prints useful context and errors (no secrets)
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
  // Create directory if missing
  fs.mkdirSync(dir, { recursive: true });
  // Create the file if it doesn't exist
  const fd = fs.openSync(resolved, 'a');
  fs.closeSync(fd);
  // Check writability
  fs.accessSync(resolved, fs.constants.W_OK);
} catch (err) {
  console.error('[ensure-sqlite] Cannot create/write DB file:', resolved, err && err.message);
  process.exit(1);
}

try {
  log('Prisma: applying DB schema (db push) and generating client');
  execSync('npx prisma db push', { stdio: 'inherit' });
  execSync('npx prisma generate', { stdio: 'inherit' });
  log('Sqlite DB ready:', resolved);
  process.exit(0);
} catch (err) {
  console.error('[ensure-sqlite] Error preparing sqlite DB:', err && err.message);
  process.exit(1);
}