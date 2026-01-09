declare module '@prisma/driver-adapter-utils' {
  export type Provider = 'mysql' | 'postgres' | 'sqlite' | 'sqlserver';

  export type ColumnType = any;

  export interface SqlResultSet {
    columnNames: string[];
    columnTypes: ColumnType[];
    rows: unknown[][];
    lastInsertId?: string;
  }

  export interface TransactionOptions {
    usePhantomQuery: boolean;
  }

  export interface Transaction {
    readonly options: TransactionOptions;
    provider: Provider;
    adapterName: string;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    // allow executing queries inside a transaction
    execute?(query: { sql: string; args?: unknown[] } | string): Promise<SqlResultSet>;
    query?(query: { sql: string; args?: unknown[] } | string): Promise<SqlResultSet>;
    executeRaw(query: { sql: string; args?: unknown[] } | string): Promise<number>;
    queryRaw(query: { sql: string; args?: unknown[] } | string): Promise<SqlResultSet>;
    executeScript?: (script: string) => Promise<void>;
  }

  export interface SqlDriverAdapter {
    provider: Provider;
    adapterName: string;
    execute(query: { sql: string; args?: unknown[] } | string): Promise<SqlResultSet>;
    dispose(): Promise<void>;
    startTransaction(isolationLevel?: unknown): Promise<Transaction>;
    getConnectionInfo?: () => { supportsRelationJoins: boolean };
    executeRaw(query: { sql: string; args?: unknown[] } | string): Promise<number>;
    queryRaw(query: { sql: string; args?: unknown[] } | string): Promise<SqlResultSet>;
    executeScript(script: string): Promise<void>;
  }

  export interface SqlDriverAdapterFactory {
    provider: Provider;
    adapterName: string;
    connect(): Promise<SqlDriverAdapter>;
  }

  export {};
}
