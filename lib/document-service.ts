import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_EXTS = ["pdf", "jpg", "jpeg", "png", "doc", "docx", "txt"];

type CodedError = Error & { code: string };

function codedError(message: string, code: string): CodedError {
  const err = new Error(message) as CodedError;
  err.code = code;
  return err;
}

// The LeaseDocument model is not yet part of the generated Prisma client types,
// so the subset of the delegate used here is described and accessed explicitly.
interface LeaseDocumentRecord {
  id: string;
  tenantId: string;
  filename: string;
  filePath: string;
  language: string;
  uploadedAt: Date;
  tenant: { userId: string };
}

interface LeaseDocumentDelegate {
  create(args: {
    data: { tenantId: string; filename: string; filePath: string; language: string };
  }): Promise<LeaseDocumentRecord>;
  findUnique(args: {
    where: { id: string };
    include: { tenant: true };
  }): Promise<LeaseDocumentRecord | null>;
  delete(args: { where: { id: string } }): Promise<LeaseDocumentRecord>;
}

function leaseDocuments(prisma: PrismaClient): LeaseDocumentDelegate {
  return (prisma as unknown as { leaseDocument: LeaseDocumentDelegate }).leaseDocument;
}

export function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

export function resolveStoredPath(uploadsDir: string, storedPath: string) {
  try {
    if (path.isAbsolute(storedPath)) return storedPath;
  } catch {}
  return path.join(uploadsDir, storedPath);
}

function ensureUploadsDir() {
  const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(process.cwd(), "uploads", "leases");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

export async function saveLeaseDocument(
  prisma: PrismaClient,
  file: File,
  tenantId: string,
  language: string,
) {
  const uploadsDir = ensureUploadsDir();

  const fileId = Math.random().toString(36).substring(2, 15);
  const originalName = file.name || "upload.bin";
  const ext = (originalName.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    throw codedError(`Unsupported file type: .${ext}`, "UNSUPPORTED_TYPE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_SIZE) {
    throw codedError("File too large (max 5MB)", "FILE_TOO_LARGE");
  }

  const safeFilename = `${fileId}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const storageRelative = path.posix.join("leases", safeFilename);
  const filePath = path.join(uploadsDir, safeFilename);
  await fs.promises.writeFile(filePath, buffer);

  const doc = await leaseDocuments(prisma).create({
    data: {
      tenantId,
      filename: file.name,
      filePath: storageRelative,
      language,
    },
  });

  return { ...doc, uploadedAt: doc.uploadedAt.toISOString() };
}

export async function fetchLeaseDocument(prisma: PrismaClient, id: string, userId: string) {
  const doc = await leaseDocuments(prisma).findUnique({ where: { id }, include: { tenant: true } });
  if (!doc || doc.tenant.userId !== userId) {
    throw codedError("Document not found", "NOT_FOUND");
  }

  const physicalPath = resolveStoredPath(
    process.env.UPLOADS_DIR
      ? path.resolve(process.env.UPLOADS_DIR)
      : path.resolve(process.cwd(), "uploads", "leases"),
    doc.filePath,
  );
  if (!fs.existsSync(physicalPath)) {
    throw codedError("Physical file not found on server disk", "PHYSICAL_MISSING");
  }

  const fileBuffer = await fs.promises.readFile(physicalPath);
  const contentType = getMimeType(doc.filename);
  return { buffer: fileBuffer, contentType, filename: doc.filename };
}

export async function deleteLeaseDocument(prisma: PrismaClient, id: string, userId: string) {
  const doc = await leaseDocuments(prisma).findUnique({ where: { id }, include: { tenant: true } });
  if (!doc || doc.tenant.userId !== userId) {
    throw codedError("Document not found", "NOT_FOUND");
  }

  const physicalPathToDelete = resolveStoredPath(
    process.env.UPLOADS_DIR
      ? path.resolve(process.env.UPLOADS_DIR)
      : path.resolve(process.cwd(), "uploads", "leases"),
    doc.filePath,
  );
  if (fs.existsSync(physicalPathToDelete)) {
    try {
      fs.unlinkSync(physicalPathToDelete);
    } catch (err) {
      console.error("Error deleting physical file:", err);
    }
  }

  await leaseDocuments(prisma).delete({ where: { id } });
  return true;
}
