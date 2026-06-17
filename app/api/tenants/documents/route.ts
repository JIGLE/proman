import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleOptions } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database";
import { saveLeaseDocument, fetchLeaseDocument, deleteLeaseDocument } from "@/lib/document-service";

export const runtime = "nodejs";

// Shared document handling implemented in lib/document-service

// POST /api/tenants/documents - Upload a lease document
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tenantId = formData.get("tenantId") as string | null;
    const language = formData.get("language") as string | null;

    if (!file || !tenantId || !language) {
      return NextResponse.json(
        { error: "Missing required fields (file, tenantId, language)" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    try {
      const saved = await saveLeaseDocument(prisma, file, tenantId, language);
      return NextResponse.json({ success: true, data: saved });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "UNSUPPORTED_TYPE")
        return NextResponse.json({ error: e.message }, { status: 415 });
      if (e.code === "FILE_TOO_LARGE")
        return NextResponse.json({ error: e.message }, { status: 413 });
      if (e.code === "NOT_FOUND") return NextResponse.json({ error: e.message }, { status: 404 });
      console.error("Error uploading lease document (tenants):", err);
      return NextResponse.json({ error: "Failed to upload lease document" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error uploading lease document:", error);
    return NextResponse.json({ error: "Failed to upload lease document" }, { status: 500 });
  }
}

// GET /api/tenants/documents - Download/view document or list documents
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing document ID parameter" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    try {
      const fileRes = await fetchLeaseDocument(prisma, id, userId);
      return new Response(fileRes.buffer, {
        headers: {
          "Content-Type": fileRes.contentType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(fileRes.filename)}"`,
        },
      });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "NOT_FOUND") return NextResponse.json({ error: e.message }, { status: 404 });
      if (e.code === "PHYSICAL_MISSING")
        return NextResponse.json({ error: e.message }, { status: 404 });
      console.error("Error fetching document:", err);
      return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

// DELETE /api/tenants/documents - Delete document
export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    try {
      await deleteLeaseDocument(prisma, id, userId);
      return NextResponse.json({ success: true, message: "Lease document successfully deleted." });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "NOT_FOUND") return NextResponse.json({ error: e.message }, { status: 404 });
      console.error("Error deleting document:", err);
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

export const OPTIONS = handleOptions;
