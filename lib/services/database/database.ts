import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { logger } from "@/lib/utils/logger";

declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    if (process.env.DATABASE_URL) {
      const dbUrl = process.env.DATABASE_URL;

      // For SQLite, verify the file exists and is writable before constructing
      if (dbUrl.startsWith("file:")) {
        const sqlitePath = dbUrl.replace(/^file:\/\//, "").replace(/^file:/, "");
        const resolvedPath = require("path").resolve(process.cwd(), sqlitePath);
        const fs = require("fs");
        const exists = fs.existsSync(resolvedPath);
        logger.debug("Using SQLite database", { path: resolvedPath, exists });
        if (!exists) {
          throw new Error(
            `SQLite DB file does not exist: ${resolvedPath}. ` +
              `Run POST /api/debug/db/init to create and initialize the database, ` +
              `or ensure a writable dataset is mounted at the path.`,
          );
        }
        try {
          fs.accessSync(resolvedPath, fs.constants.W_OK);
        } catch {
          throw new Error(
            `SQLite DB file is not writable: ${resolvedPath}. ` +
              `Fix permissions with: chmod 666 ${resolvedPath} && chown app:app ${resolvedPath}`,
          );
        }
      }

      // Prisma 7 requires a driver adapter to provide the database connection
      try {
        const adapter = new PrismaBetterSqlite3({ url: dbUrl });
        globalForPrisma.prisma = new PrismaClient({ adapter });
        logger.debug("PrismaClient constructed successfully");

        // Validate connection with a quick query
        try {
          (
            globalForPrisma.prisma as unknown as {
              $queryRawUnsafe: (q: string) => Promise<unknown>;
            }
          ).$queryRawUnsafe("SELECT 1");
        } catch {
          logger.warn("Database connection check skipped or failed — queries may fail at runtime");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          "Failed to construct PrismaClient",
          err instanceof Error ? err : new Error(message),
        );
        throw new Error(`Prisma initialization failed: ${message}`);
      }
    } else {
      // During build time, create a mock client that throws an error if used
      globalForPrisma.prisma = new Proxy({} as PrismaClient, {
        get: (target, prop) => {
          if (prop === "$connect" || prop === "$disconnect") {
            return () => Promise.resolve();
          }
          throw new Error("PrismaClient not available during build time");
        },
      });
    }
  }
  return globalForPrisma.prisma;
}

export { getPrismaClient };
// Remove the default prisma export to prevent build-time initialization
// export const prisma = getPrismaClient();

// Domain service implementations have been extracted into dedicated modules
// under lib/services/database/* and routes now import from those modules
// directly. This file remains the Prisma client and test-helper surface.

// Database initialization and seeding
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if we have any templates (indicating database is seeded)
    const templateCount = await getPrismaClient().correspondenceTemplate.count();

    if (templateCount === 0) {
      // Seed initial templates
      await getPrismaClient().correspondenceTemplate.createMany({
        data: [
          {
            name: "Welcome Letter",
            type: "welcome",
            subject: "Welcome to {{property_name}}",
            content: `Dear {{tenant_name}},

Welcome to {{property_name}}! We're excited to have you as our tenant.

Your lease begins on {{lease_start}} and runs through {{lease_end}}.

Property Details:
- Address: {{property_address}}
- Monthly Rent: $\{{rent_amount}}
- Bedrooms: {{bedrooms}}
- Bathrooms: {{bathrooms}}

Please don't hesitate to contact us if you need anything.

Best regards,
Property Management Team`,
            variables: JSON.stringify([
              "tenant_name",
              "property_name",
              "lease_start",
              "lease_end",
              "property_address",
              "rent_amount",
              "bedrooms",
              "bathrooms",
            ]),
          },
          {
            name: "Rent Payment Reminder",
            type: "rent_reminder",
            subject: "Rent Payment Due - {{property_name}}",
            content: `Dear {{tenant_name}},

This is a friendly reminder that your rent payment of $\{{rent_amount}} for {{property_name}} is due on {{due_date}}.

Please ensure payment is made by the due date to avoid any late fees.

Payment can be made via:
- Bank transfer to: [Account details]
- Online portal: [Portal link]
- Check mailed to: [Mailing address]

If you have already made this payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
Property Management Team`,
            variables: JSON.stringify(["tenant_name", "property_name", "rent_amount", "due_date"]),
          },
        ],
      });
      console.debug("Database seeded with initial templates");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Test helper: allow tests to inject a PrismaClient instance so they can run without a real DB.
// This is intentionally export-only for tests and guarded by an environment check.
export function setPrismaClientForTests(client: PrismaClient | undefined) {
  if (process.env.NODE_ENV !== "test") {
    console.debug("[database] setPrismaClientForTests called outside NODE_ENV=test");
  }
  globalForPrisma.prisma = client;
}

export function resetPrismaClientForTests() {
  if (process.env.NODE_ENV !== "test") {
    console.debug("[database] resetPrismaClientForTests called outside NODE_ENV=test");
  }
  // Clear the cached client so subsequent getPrismaClient calls will re-evaluate
  globalForPrisma.prisma = undefined;
}
