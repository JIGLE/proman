/**
 * PII Field Encryption — AES-256-GCM
 *
 * Encrypts sensitive fields (IBAN, NIF, phone) at rest.
 * Uses a 32-byte hex key from PII_ENCRYPTION_KEY env var.
 *
 * Usage: wrap field values with encrypt()/decrypt() in service layer,
 * or use the Prisma extension for automatic field-level encryption.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;
const ENCODING = "base64" as const;

// Prefix for encrypted values to distinguish from plaintext
const ENCRYPTED_PREFIX = "enc:";

function getEncryptionKey(): Buffer | null {
  const hex = process.env.PII_ENCRYPTION_KEY;
  if (!hex || hex.length < 64) return null;
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string. Returns prefixed base64 string.
 * If no key is configured, returns plaintext unchanged (dev mode).
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  if (!key) return plaintext; // No key = no encryption (dev mode)

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: enc:<iv>:<tag>:<ciphertext> (all base64)
  return `${ENCRYPTED_PREFIX}${iv.toString(ENCODING)}:${tag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
}

/**
 * Decrypt an encrypted PII string. If not prefixed, assumes plaintext.
 */
export function decryptPII(ciphertext: string): string {
  if (!ciphertext || !ciphertext.startsWith(ENCRYPTED_PREFIX))
    return ciphertext;

  const key = getEncryptionKey();
  if (!key) {
    console.warn(
      "[PII] Encrypted data found but PII_ENCRYPTION_KEY not set — cannot decrypt",
    );
    return "[ENCRYPTED]";
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(":");
  if (parts.length !== 3) {
    console.warn("[PII] Malformed encrypted value");
    return "[ENCRYPTED]";
  }

  const iv = Buffer.from(parts[0], ENCODING);
  const tag = Buffer.from(parts[1], ENCODING);
  const encrypted = Buffer.from(parts[2], ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(ENCRYPTED_PREFIX) ?? false;
}

/**
 * Mask a decrypted PII value for display (e.g. IBAN → "PT50****1234")
 */
export function maskPII(
  value: string,
  visibleStart = 4,
  visibleEnd = 4,
): string {
  if (!value || value.length <= visibleStart + visibleEnd) return value;
  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  return `${start}${"*".repeat(Math.min(value.length - visibleStart - visibleEnd, 8))}${end}`;
}

/**
 * PII fields that should be encrypted in each model
 */
export const PII_FIELDS: Record<string, string[]> = {
  PaymentMethod: ["iban", "accountHolder", "mbwayPhone"],
  Owner: ["taxIdentificationNumber", "phone"],
  Tenant: ["phone"],
  RentReceipt: ["landlordNif", "tenantNif"],
  NRUARegistration: ["landlordNif", "tenantNif"],
};
