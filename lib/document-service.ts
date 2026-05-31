import fs from 'fs';
import path from 'path';

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_EXTS = ['pdf','jpg','jpeg','png','doc','docx','txt'];

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
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
    : path.resolve(process.cwd(), 'uploads', 'leases');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

export async function saveLeaseDocument(prisma: any, file: File, tenantId: string, language: string) {
  const uploadsDir = ensureUploadsDir();

  const fileId = Math.random().toString(36).substring(2, 15);
  const originalName = file.name || 'upload.bin';
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    const err: any = new Error(`Unsupported file type: .${ext}`);
    err.code = 'UNSUPPORTED_TYPE';
    throw err;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_SIZE) {
    const err: any = new Error('File too large (max 5MB)');
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }

  const safeFilename = `${fileId}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const storageRelative = path.posix.join('leases', safeFilename);
  const filePath = path.join(uploadsDir, safeFilename);
  await fs.promises.writeFile(filePath, buffer);

  const doc = await prisma.leaseDocument.create({
    data: {
      tenantId,
      filename: file.name,
      filePath: storageRelative,
      language,
    }
  });

  return { ...doc, uploadedAt: doc.uploadedAt.toISOString() };
}

export async function fetchLeaseDocument(prisma: any, id: string, userId: string) {
  const doc = await prisma.leaseDocument.findUnique({ where: { id }, include: { tenant: true } });
  if (!doc || doc.tenant.userId !== userId) {
    const err: any = new Error('Document not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const physicalPath = resolveStoredPath(process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(process.cwd(), 'uploads', 'leases'), doc.filePath);
  if (!fs.existsSync(physicalPath)) {
    const err: any = new Error('Physical file not found on server disk');
    err.code = 'PHYSICAL_MISSING';
    throw err;
  }

  const fileBuffer = await fs.promises.readFile(physicalPath);
  const contentType = getMimeType(doc.filename);
  return { buffer: fileBuffer, contentType, filename: doc.filename };
}

export async function deleteLeaseDocument(prisma: any, id: string, userId: string) {
  const doc = await prisma.leaseDocument.findUnique({ where: { id }, include: { tenant: true } });
  if (!doc || doc.tenant.userId !== userId) {
    const err: any = new Error('Document not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const physicalPathToDelete = resolveStoredPath(process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(process.cwd(), 'uploads', 'leases'), doc.filePath);
  if (fs.existsSync(physicalPathToDelete)) {
    try { fs.unlinkSync(physicalPathToDelete); } catch (err) { console.error('Error deleting physical file:', err); }
  }

  await prisma.leaseDocument.delete({ where: { id } });
  return true;
}
