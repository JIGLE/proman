import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function getUploadDir(ticketId: string): string {
  const base = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(process.cwd(), "uploads");
  return path.join(base, "maintenance", ticketId);
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function parseImages(raw: unknown): string[] {
  if (typeof raw === "string") return JSON.parse(raw) as string[];
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

type RouteContext = { params: Promise<{ id: string; filename: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const { id, filename } = await context.params;
  const safeFilename = path.basename(filename);

  const prisma = getPrismaClient();
  const ticket = await prisma.maintenanceTicket.findFirst({ where: { id, userId } });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(getUploadDir(id), safeFilename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": getMimeType(safeFilename),
      "Cache-Control": "private, max-age=86400",
    },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const { id, filename } = await context.params;
  const safeFilename = path.basename(filename);

  const prisma = getPrismaClient();
  const ticket = await prisma.maintenanceTicket.findFirst({ where: { id, userId } });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const urlToRemove = `/api/maintenance/${id}/images/${safeFilename}`;
  const existing = parseImages(ticket.images);
  const updated = existing.filter((url) => url !== urlToRemove);

  await prisma.maintenanceTicket.update({
    where: { id },
    data: { images: JSON.stringify(updated) },
  });

  const filePath = path.join(getUploadDir(id), safeFilename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return NextResponse.json({ success: true, images: updated });
}
