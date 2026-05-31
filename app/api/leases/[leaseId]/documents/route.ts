import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { getPrismaClient } from '@/lib/database';
import { saveLeaseDocument, fetchLeaseDocument, deleteLeaseDocument } from '@/lib/document-service';

export const runtime = 'nodejs';

function getMimeType(filename: string): string {
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

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTS = ['pdf','jpg','jpeg','png','doc','docx','txt'];

function resolveStoredPath(uploadsDir: string, storedPath: string) {
  try {
    if (path.isAbsolute(storedPath)) return storedPath;
  } catch {}
  return path.join(uploadsDir, storedPath);
}

// POST /api/leases/[leaseId]/documents - Upload a lease document linked to a tenant (leaseId==tenantId)
export async function POST(req: NextRequest, context: { params: Promise<{ leaseId: string }> }): Promise<Response> {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { leaseId } = await context.params;
    if (!leaseId) return NextResponse.json({ error: 'Missing leaseId in path' }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;

    if (!file || !language) {
      return NextResponse.json({ error: 'Missing required fields (file, language)' }, { status: 400 });
    }

    const prisma = getPrismaClient();
    try {
      const saved = await saveLeaseDocument(prisma, file, leaseId, language);
      return NextResponse.json({ success: true, data: saved });
    } catch (err: unknown) {
      const e: any = err as any;
      if (e.code === 'UNSUPPORTED_TYPE') return NextResponse.json({ error: e.message }, { status: 415 });
      if (e.code === 'FILE_TOO_LARGE') return NextResponse.json({ error: e.message }, { status: 413 });
      if (e.code === 'NOT_FOUND') return NextResponse.json({ error: e.message }, { status: 404 });
      console.error('Error uploading lease document (leases alias):', err);
      return NextResponse.json({ error: 'Failed to upload lease document' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error uploading lease document (leases alias):', error);
    return NextResponse.json({ error: 'Failed to upload lease document' }, { status: 500 });
  }
}

// GET /api/leases/[leaseId]/documents?id=<docId> - Download/view document (id required)
export async function GET(req: NextRequest, context: { params: Promise<{ leaseId: string }> }): Promise<Response> {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing document ID parameter' }, { status: 400 });
    }

    const prisma = getPrismaClient();
    try {
      const fileRes = await fetchLeaseDocument(prisma, id, userId);
      return new Response(fileRes.buffer, {
        headers: {
          'Content-Type': fileRes.contentType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(fileRes.filename)}"`,
        }
      });
    } catch (err: unknown) {
      const e: any = err as any;
      if (e.code === 'NOT_FOUND') return NextResponse.json({ error: e.message }, { status: 404 });
      if (e.code === 'PHYSICAL_MISSING') return NextResponse.json({ error: e.message }, { status: 404 });
      console.error('Error fetching document (leases alias):', err);
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching document (leases alias):', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

// DELETE /api/leases/[leaseId]/documents?id=<docId>
export async function DELETE(req: NextRequest, context: { params: Promise<{ leaseId: string }> }): Promise<Response> {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
    }

    const prisma = getPrismaClient();
    try {
      await deleteLeaseDocument(prisma, id, userId);
      return NextResponse.json({ success: true, message: 'Lease document successfully deleted.' });
    } catch (err: unknown) {
      const e: any = err as any;
      if (e.code === 'NOT_FOUND') return NextResponse.json({ error: e.message }, { status: 404 });
      console.error('Error deleting document (leases alias):', err);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting document (leases alias):', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

export const OPTIONS = handleOptions;
