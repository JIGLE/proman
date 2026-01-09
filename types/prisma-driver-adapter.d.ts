declare module '@prisma/driver-adapter-utils' {
  export type Provider = 'mysql' | 'postgres' | 'sqlite' | 'sqlserver';

  export type ColumnType = any;

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
    startTransaction: (isolationLevel?: unknown) => Promise<any>;
    commit?: () => Promise<void> | void;
    rollback?: () => Promise<void> | void;
    getConnectionInfo?: () => { supportsRelationJoins: boolean };
    executeRaw: (query: { sql: string; args?: unknown[] } | string) => Promise<any>;
    queryRaw: (query: { sql: string; args?: unknown[] } | string) => Promise<any>;
    executeScript: (script: string) => Promise<void>;
  }

  export interface SqlDriverAdapterFactory {
    provider: Provider;
    adapterName: string;
    connect(): Promise<SqlDriverAdapter>;
  }

  export {};
}
