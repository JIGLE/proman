/**
 * Prisma Client Extension — transparent PII field encryption.
 *
 * `lib/utils/pii-encryption.ts` defines `PII_FIELDS` (which model fields hold
 * IBANs, NIFs, phone numbers) and `encryptPII`/`decryptPII`, but nothing
 * called them outside the TOTP auth routes — every other service wrote and
 * read those fields as plaintext. This extension closes that gap at the
 * single choke point every caller already goes through (`getPrismaClient()`),
 * instead of touching each of the ~10 call sites per model individually:
 *
 *   - On create/createMany/update/updateMany/upsert, PII_FIELDS values in
 *     the write args are encrypted before Prisma sees them.
 *   - On every operation's result, PII_FIELDS values are decrypted before
 *     the caller sees them (covers reads AND the row Prisma returns from a
 *     write, so an API response right after `create()` isn't ciphertext).
 *
 * `decryptPII`/`encryptPII` are no-ops on values that aren't in their
 * expected state (decrypt on non-"enc:"-prefixed plaintext, encrypt when no
 * `PII_ENCRYPTION_KEY` is configured), so this is safe to layer over rows
 * written before the extension existed — see `scripts/backfill-pii-encryption.js`
 * to actually encrypt those at rest rather than rely on read-time passthrough.
 */

import { Prisma } from "@prisma/client";
import { encryptPII, decryptPII, PII_FIELDS } from "@/lib/utils/pii-encryption";

const WRITE_OPERATIONS = new Set(["create", "createMany", "update", "updateMany", "upsert"]);

function withTransformedFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
  transform: (value: string) => string,
): T {
  const next = { ...obj };
  for (const field of fields) {
    const value = next[field];
    if (typeof value === "string") {
      (next as Record<string, unknown>)[field] = transform(value);
    }
  }
  return next;
}

export function encryptArgs<T>(args: T, fields: string[]): T {
  if (!args || typeof args !== "object") return args;
  const next = { ...(args as Record<string, unknown>) };

  if (Array.isArray(next.data)) {
    next.data = next.data.map((item) =>
      item && typeof item === "object"
        ? withTransformedFields(item as Record<string, unknown>, fields, encryptPII)
        : item,
    );
  } else if (next.data && typeof next.data === "object") {
    next.data = withTransformedFields(next.data as Record<string, unknown>, fields, encryptPII);
  }

  // upsert: { where, create, update }
  if (next.create && typeof next.create === "object") {
    next.create = withTransformedFields(next.create as Record<string, unknown>, fields, encryptPII);
  }
  if (next.update && typeof next.update === "object") {
    next.update = withTransformedFields(next.update as Record<string, unknown>, fields, encryptPII);
  }

  return next as T;
}

export function decryptResult(result: unknown, fields: string[]): unknown {
  if (Array.isArray(result)) {
    return result.map((item) =>
      item && typeof item === "object"
        ? withTransformedFields(item as Record<string, unknown>, fields, decryptPII)
        : item,
    );
  }
  if (result && typeof result === "object") {
    return withTransformedFields(result as Record<string, unknown>, fields, decryptPII);
  }
  return result;
}

export const piiEncryptionExtension = Prisma.defineExtension({
  name: "pii-encryption",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const fields = model ? PII_FIELDS[model] : undefined;
        if (!fields || fields.length === 0) {
          return query(args);
        }

        const nextArgs = WRITE_OPERATIONS.has(operation) ? encryptArgs(args, fields) : args;
        const result = await query(nextArgs);
        return decryptResult(result, fields);
      },
    },
  },
});
