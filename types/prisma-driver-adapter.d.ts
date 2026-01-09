declare module '@prisma/driver-adapter-utils' {
  export interface SqlResultSet {
    columnNames: string[];
    columnTypes: string[];
    rows: unknown[][];
    lastInsertId?: string;
  }

  export interface SqlDriverAdapter {
    provider: string;
    adapterName: string;
    execute(query: { sql: string; args?: unknown[] }): Promise<SqlResultSet>;
    dispose(): Promise<void> | void;
    startTransaction?: () => Promise<SqlDriverAdapter> | SqlDriverAdapter;
    commit?: () => Promise<void> | void;
    rollback?: () => Promise<void> | void;
    getConnectionInfo?: () => Promise<Record<string, unknown>> | Record<string, unknown>;
  }

  export interface SqlDriverAdapterFactory {
    provider: string;
    adapterName: string;
    connect(): Promise<SqlDriverAdapter> | SqlDriverAdapter;
  }

  export {};
}
