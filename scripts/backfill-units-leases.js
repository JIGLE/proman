#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function getDbPath() {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  if (!url.startsWith('file:')) throw new Error('Only file based DATABASE_URL supported by this script');
  const p = url.replace(/^file:\/\//, '').replace(/^file:/, '');
  return path.resolve(process.cwd(), p);
}

function randomId(prefix) {
  return prefix + Math.random().toString(36).slice(2, 10);
}

(async () => {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error('DB file not found at', dbPath);
    process.exit(1);
  }
  const db = new Database(dbPath, { readonly: false });
  try {
    console.log('Starting conservative backfill for units and leases on', dbPath);

    const properties = db.prepare('SELECT id, userId, name, rent FROM properties').all();
    console.log('Properties found:', properties.length);

    let unitsCreated = 0;
    for (const p of properties) {
      const unitExists = db.prepare('SELECT 1 FROM units WHERE propertyId = ? LIMIT 1').get(p.id);
      if (unitExists) continue;
      const newId = randomId('u');
      db.prepare("INSERT INTO units (id, userId, propertyId, unitNumber, name, rent, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))")
        .run(newId, p.userId, p.id, '1', `${p.name} Unit 1`, p.rent || null, 'vacant');
      unitsCreated++;
      console.log('Created unit', newId, 'for property', p.id);
    }

    const tenants = db.prepare('SELECT id, userId, propertyId, leaseStart, leaseEnd, rent FROM tenants WHERE propertyId IS NOT NULL').all();
    console.log('Tenants with propertyId found:', tenants.length);

    let leasesCreated = 0;
    for (const t of tenants) {
      const existingLease = db.prepare('SELECT 1 FROM leases WHERE tenantId = ? LIMIT 1').get(t.id);
      if (existingLease) continue;
      const unit = db.prepare('SELECT id FROM units WHERE propertyId = ? LIMIT 1').get(t.propertyId);
      if (!unit) {
        console.warn('No unit for tenant property, skipping tenant:', t.id);
        continue;
      }
      const leaseId = randomId('l');
      db.prepare("INSERT INTO leases (id, userId, unitId, tenantId, startDate, endDate, rent, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))")
        .run(leaseId, t.userId, unit.id, t.id, t.leaseStart, t.leaseEnd, t.rent || null);
      leasesCreated++;
      console.log('Created lease', leaseId, 'for tenant', t.id, 'unit', unit.id);
    }

    console.log('Backfill complete. Units created:', unitsCreated, 'Leases created:', leasesCreated);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try { db.close(); } catch {}
  }
})();

