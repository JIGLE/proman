declare module '@prisma/driver-adapter-utils' {
  export type Provider = 'mysql' | 'postgres' | 'sqlite' | 'sqlserver';

  export type ColumnType = unknown;

  export interface SqlResultSet {
    columnNames: string[];
    columnTypes: ColumnType[];
    rows: unknown[][];
    lastInsertId?: string;
  }

  export interface SqlDriverAdapter {
    provider: Provider;
    adapterName: string;
    execute(query: { sql: string; args?: unknown[] }): Promise<SqlResultSet>;
    dispose(): Promise<void>;
    startTransaction: (isolationLevel?: unknown) => Promise<unknown>;
    commit?: () => Promise<void> | void;
    rollback?: () => Promise<void> | void;
    getConnectionInfo?: () => { supportsRelationJoins: boolean };
    executeRaw: (query: { sql: string; args?: unknown[] } | string) => Promise<unknown>;
    queryRaw: (query: { sql: string; args?: unknown[] } | string) => Promise<unknown>;
    executeScript: (script: string) => Promise<void>;
  }

  export interface SqlDriverAdapterFactory {
    provider: Provider;
    adapterName: string;
    connect(): Promise<SqlDriverAdapter>;
  }

  export {};
}
