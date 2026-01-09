// Lightweight Sqlite adapter for Prisma's driver-adapter interface
// NOTE: This is a pragmatic shim for local CI/testing with SQLite.
// It implements the minimal parts of the SqlDriverAdapterFactory/SqlDriverAdapter
// needed by Prisma Client to run queries.

import { resolve } from 'path';
import type { SqlDriverAdapterFactory, SqlDriverAdapter, SqlResultSet } from '@prisma/driver-adapter-utils';

// Use require to avoid bundler issues
const BetterSqlite3 = require('better-sqlite3');

function getSqlitePathFromDatabaseUrl(dbUrl: string): string {
  // dbUrl like file:./dev.db or file:./ci-123.db
  if (!dbUrl.startsWith('file:')) throw new Error('Not a sqlite DATABASE_URL');
  const sqlitePath = dbUrl.replace(/^file:\/\//, '').replace(/^file:/, '');
  return resolve(process.cwd(), sqlitePath);
}

export function createSqliteDriverAdapterFactory(dbUrl: string | undefined): SqlDriverAdapterFactory {
  const dbPath = dbUrl ? getSqlitePathFromDatabaseUrl(dbUrl) : undefined;

  return {
    provider: 'sqlite',
    adapterName: 'better-sqlite3-adapter',
    async connect(): Promise<SqlDriverAdapter> {
      if (!dbPath) throw new Error('DATABASE_URL not set for sqlite adapter');
      const db = new BetterSqlite3(dbPath, { readonly: false });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function runQuery(sql: string, args: any[] = []): SqlResultSet {
        const trimmed = sql.trim().toLowerCase();
        if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
          const stmt = db.prepare(sql);
          const rows = stmt.all(...args);
          const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
          const resultRows: unknown[][] = rows.map((r: Record<string, unknown>) =>
            columnNames.map((k) => (r as Record<string, unknown>)[k]),
          );
          return {
            columnNames,
            columnTypes: [],
            rows: resultRows,
          } as SqlResultSet;
        } else {
          const stmt = db.prepare(sql);
          const info = stmt.run(...args);
          return {
            columnNames: [],
            columnTypes: [],
            rows: [],
            lastInsertId: info.lastInsertRowid ? String(info.lastInsertRowid) : undefined,
          } as SqlResultSet;
        }
      }

      const adapter: SqlDriverAdapter = {
        provider: 'sqlite',
        adapterName: 'better-sqlite3-adapter',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async execute(query: { sql: string; args?: any[] }): Promise<SqlResultSet> {
          return runQuery(query.sql, query.args || []);
        },
        async dispose() {
          try {
            db.close();
          } catch {
            // ignore
          }
        },
        async startTransaction(_isolationLevel?: unknown) {
          db.exec('BEGIN');
          const txAdapter: SqlDriverAdapter = {
            adapterName: 'better-sqlite3-transaction',
            provider: 'sqlite',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async execute(query: { sql: string; args?: any[] }): Promise<SqlResultSet> {
              return runQuery(query.sql, query.args || []);
            },
            async executeRaw(param: string | { sql: string; args?: any[] } , args?: any[]): Promise<SqlResultSet> {
              const sql = typeof param === 'string' ? param : param.sql;
              const a = typeof param === 'string' ? args || [] : param.args || [];
              return runQuery(sql, a);
            },
            async queryRaw(param: string | { sql: string; args?: any[] } , args?: any[]): Promise<SqlResultSet> {
              const sql = typeof param === 'string' ? param : param.sql;
              const a = typeof param === 'string' ? args || [] : param.args || [];
              return runQuery(sql, a);
            },
            async executeScript(script: string): Promise<void> {
              // execute arbitrary SQL script
              try {
                db.exec(script);
              } catch {
                // ignore execution errors here
              }
            },
            async dispose() {
              // nothing special
            },
            async startTransaction(_isolationLevel?: unknown) {
              // nested transactions not supported; return self
              return txAdapter;
            },
            async commit() {
              db.exec('COMMIT');
            },
            async rollback() {
              db.exec('ROLLBACK');
            },
            getConnectionInfo() {
              return { supportsRelationJoins: false };
            },
          };

          return txAdapter;
        },
        async executeRaw(param: string | { sql: string; args?: any[] } , args?: any[]): Promise<SqlResultSet> {
          const sql = typeof param === 'string' ? param : param.sql;
          const a = typeof param === 'string' ? args || [] : param.args || [];
          return runQuery(sql, a);
        },
        async queryRaw(param: string | { sql: string; args?: any[] } , args?: any[]): Promise<SqlResultSet> {
          const sql = typeof param === 'string' ? param : param.sql;
          const a = typeof param === 'string' ? args || [] : param.args || [];
          return runQuery(sql, a);
        },
        async executeScript(script: string): Promise<void> {
          try {
            db.exec(script);
          } catch {
            // ignore
          }
        },
        getConnectionInfo() {
          return { supportsRelationJoins: false };
        },
      };

      return adapter;
    },
  };
}
