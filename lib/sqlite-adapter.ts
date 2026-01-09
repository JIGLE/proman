// Lightweight Sqlite adapter for Prisma's driver-adapter interface
// NOTE: This is a pragmatic shim for local CI/testing with SQLite.
// It implements the minimal parts of the SqlDriverAdapterFactory/SqlDriverAdapter
// needed by Prisma Client to run queries.

import { resolve } from 'path';

// Use require to avoid bundler issues
const BetterSqlite3 = require('better-sqlite3');

function getSqlitePathFromDatabaseUrl(dbUrl: string) {
  // dbUrl like file:./dev.db or file:./ci-123.db
  if (!dbUrl.startsWith('file:')) throw new Error('Not a sqlite DATABASE_URL');
  const sqlitePath = dbUrl.replace(/^file:\/\//, '').replace(/^file:/, '');
  return resolve(process.cwd(), sqlitePath);
}

export function createSqliteDriverAdapterFactory(dbUrl: string | undefined) {
  const dbPath = dbUrl ? getSqlitePathFromDatabaseUrl(dbUrl) : undefined;

  return {
    provider: 'sqlite',
    adapterName: 'better-sqlite3-adapter',
    async connect() {
      if (!dbPath) throw new Error('DATABASE_URL not set for sqlite adapter');
      const db = new BetterSqlite3(dbPath, { readonly: false });

      function runQuery(sql: string, args: any[]) {
        const trimmed = sql.trim().toLowerCase();
        if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
          const stmt = db.prepare(sql);
          const rows = stmt.all(...(args || []));
          const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
          const resultRows = rows.map((r: any) => columnNames.map((k) => (r as any)[k]));
          return {
            columnNames,
            columnTypes: [],
            rows: resultRows,
          };
        } else {
          const stmt = db.prepare(sql);
          const info = stmt.run(...(args || []));
          return {
            columnNames: [],
            columnTypes: [],
            rows: [],
            lastInsertId: info.lastInsertRowid ? String(info.lastInsertRowid) : undefined,
          };
        }
      }

      const adapter = {
        provider: 'sqlite',
        adapterName: 'better-sqlite3-adapter',
        async execute(query: { sql: string; args: any[] }) {
          return runQuery(query.sql, query.args || []);
        },
        async dispose() {
          try {
            db.close();
          } catch (e) {
            // ignore
          }
        },
        async startTransaction() {
          db.exec('BEGIN');
          return {
            adapterName: 'better-sqlite3-transaction',
            provider: 'sqlite',
            async execute(query: { sql: string; args: any[] }) {
              return runQuery(query.sql, query.args || []);
            },
            async dispose() {
              // nothing special
            },
            async commit() {
              db.exec('COMMIT');
            },
            async rollback() {
              db.exec('ROLLBACK');
            },
            async getConnectionInfo() {
              return { supportsRelationJoins: false };
            },
          };
        },
        async getConnectionInfo() {
          return { supportsRelationJoins: false };
        },
      };

      return adapter;
    },
  };
}
