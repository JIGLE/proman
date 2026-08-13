/**
 * Detects the gap between `prisma/schema.prisma` and the database actually being served.
 *
 * This exists because that gap is invisible until it isn't. Adding one nullable column to a
 * model breaks every query that reads the model — Prisma selects all scalar fields by default,
 * so a missing column takes down `findMany` on the whole table, not just the feature that added
 * it. The symptom is a 500 from unrelated routes, and the cause is named only in a server log:
 *
 *     The column `main.tenants.portalAccessRevokedAt` does not exist in the current database
 *
 * Nothing surfaced that. `scripts/ensure-sqlite.js` applies the fix on container start via
 * `AUTO_DB_SCHEMA_SYNC`, so a deployed instance heals itself — but an operator who disabled that
 * flag, or a developer whose local database predates a pull, gets no signal beyond broken pages.
 *
 * SQLite only, matching the rest of the deployment. `PRAGMA table_info` is the introspection
 * source; the schema file is parsed rather than reflected because the Prisma client does not
 * expose the mapping at runtime.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getPrismaClient } from "@/lib/services/database/database";

export interface SchemaDriftResult {
  /** True when every model's table and scalar columns are present. */
  inSync: boolean;
  missingTables: string[];
  /** `table.column` for each column the schema declares and the database lacks. */
  missingColumns: string[];
  /** Tables compared. Zero means the parse failed, which is itself reported. */
  tablesChecked: number;
  /** Set when the check could not run at all — never silently "in sync". */
  error?: string;
}

/** Relation fields and attribute lines are not columns; only scalars are. */
const SCALAR_TYPES = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes",
]);

interface ParsedModel {
  table: string;
  columns: string[];
}

/**
 * Extract each model's mapped table name and scalar column names.
 *
 * Exported for testing: the parser is the part most likely to rot silently as the schema grows,
 * and a parser that quietly returns nothing would make the whole check report "in sync".
 */
export function parseSchemaModels(schema: string): ParsedModel[] {
  const models: ParsedModel[] = [];
  const modelPattern = /model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;

  for (const match of schema.matchAll(modelPattern)) {
    const [, modelName, body] = match;

    const mapped = body.match(/@@map\(\s*["']([^"']+)["']\s*\)/);
    const table = mapped ? mapped[1] : modelName;

    const columns: string[] = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      // Skip blanks, comments and block attributes (@@index, @@map, @@unique…).
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;

      const field = line.match(/^(\w+)\s+(\w+)/);
      if (!field) continue;
      const [, name, type] = field;

      // A relation field carries a model type, not a scalar one, and occupies no column of its
      // own — the foreign key is a separate scalar field beside it.
      if (!SCALAR_TYPES.has(type)) continue;

      // `@map("db_name")` renames the column; the database knows only that name.
      const renamed = line.match(/@map\(\s*["']([^"']+)["']\s*\)/);
      columns.push(renamed ? renamed[1] : name);
    }

    if (columns.length > 0) models.push({ table, columns });
  }

  return models;
}

interface SqliteColumn {
  name: string;
}

/**
 * Compare the schema file with the live database.
 *
 * Never throws: a diagnostics check that crashes tells the operator less than one that reports
 * why it could not answer, and this runs on a page whose whole purpose is to work when other
 * things do not.
 */
export async function checkSchemaDrift(): Promise<SchemaDriftResult> {
  const empty: SchemaDriftResult = {
    inSync: false,
    missingTables: [],
    missingColumns: [],
    tablesChecked: 0,
  };

  let models: ParsedModel[];
  try {
    const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
    models = parseSchemaModels(readFileSync(schemaPath, "utf8"));
  } catch (error) {
    return { ...empty, error: `Could not read prisma/schema.prisma: ${describe(error)}` };
  }

  if (models.length === 0) {
    // Reporting "in sync" here would be the worst possible answer: a parser that matched nothing
    // looks identical to a database that is perfectly aligned.
    return { ...empty, error: "No models parsed from prisma/schema.prisma — parser out of date?" };
  }

  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  try {
    const prisma = getPrismaClient();

    for (const model of models) {
      const info = await prisma.$queryRawUnsafe<SqliteColumn[]>(
        `PRAGMA table_info("${model.table}")`,
      );

      // PRAGMA on an absent table returns no rows rather than erroring.
      if (!Array.isArray(info) || info.length === 0) {
        missingTables.push(model.table);
        continue;
      }

      const present = new Set(info.map((column) => column.name));
      for (const column of model.columns) {
        if (!present.has(column)) missingColumns.push(`${model.table}.${column}`);
      }
    }
  } catch (error) {
    return { ...empty, tablesChecked: models.length, error: describe(error) };
  }

  return {
    inSync: missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
    tablesChecked: models.length,
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
