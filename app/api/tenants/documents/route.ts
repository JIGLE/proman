import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { getPrismaClient } from '@/lib/database';
import { saveLeaseDocument, fetchLeaseDocument, deleteLeaseDocument } from '@/lib/document-service';

export const runtime = 'nodejs';

// Shared document handling implemented in lib/document-service

// POST /api/tenants/documents - Upload a lease document
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tenantId = formData.get('tenantId') as string | null;
    const language = formData.get('language') as string | null;

    if (!file || !tenantId || !language) {
      return NextResponse.json({ error: 'Missing required fields (file, tenantId, language)' }, { status: 400 });
    }

    const prisma = getPrismaClient();
    try {
      const saved = await saveLeaseDocument(prisma, file, tenantId, language);
      return NextResponse.json({ success: true, data: saved });
    } catch (err: unknown) {
      const e: any = err as any;
      if (e.code === 'UNSUPPORTED_TYPE') return NextResponse.json({ error: e.message }, { status: 415 });
      if (e.code === 'FILE_TOO_LARGE') return NextResponse.json({ error: e.message }, { status: 413 });
      if (e.code === 'NOT_FOUND') return NextResponse.json({ error: e.message }, { status: 404 });
      console.error('Error uploading lease document (tenants):', err);
      return NextResponse.json({ error: 'Failed to upload lease document' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error uploading lease document:', error);
    return NextResponse.json({ error: 'Failed to upload lease document' }, { status: 500 });
  }
}

// GET /api/tenants/documents - Download/view document or list documents
export async function GET(req: NextRequest): Promise<Response> {
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

    const doc = await prisma.leaseDocument.findUnique({
      where: { id },
      include: { tenant: true }
    });

    if (!doc || doc.tenant.userId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const physicalPath = resolveStoredPath(process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(process.cwd(), 'uploads', 'leases'), doc.filePath);
    if (!fs.existsSync(physicalPath)) {
      return NextResponse.json({ error: 'Physical file not found on server disk' }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(physicalPath);
    const contentType = getMimeType(doc.filename);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.filename)}"`,
      }
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

// DELETE /api/tenants/documents - Delete document
export async function DELETE(req: NextRequest): Promise<Response> {
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

    const doc = await prisma.leaseDocument.findUnique({
      where: { id },
      include: { tenant: true }
    });

    if (!doc || doc.tenant.userId !== userId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete physical file
    const physicalPathToDelete = resolveStoredPath(process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(process.cwd(), 'uploads', 'leases'), doc.filePath);
    if (fs.existsSync(physicalPathToDelete)) {
      try {
        fs.unlinkSync(physicalPathToDelete);
      } catch (err) {
        console.error('Error deleting physical file:', err);
      }
    }

    // Delete DB record
    await prisma.leaseDocument.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Lease document successfully deleted.' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

export const OPTIONS = handleOptions;
