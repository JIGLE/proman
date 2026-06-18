import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getUploadDir(ticketId: string): string {
  const base = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(process.cwd(), "uploads");
  return path.join(base, "maintenance", ticketId);
}

function parseImages(raw: unknown): string[] {
  if (typeof raw === "string") return JSON.parse(raw) as string[];
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const { id } = await context.params;
  const prisma = getPrismaClient();

  const ticket = await prisma.maintenanceTicket.findFirst({ where: { id, userId } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 415 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 413 });
  }

  const uploadDir = getUploadDir(id);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

  const existing = parseImages(ticket.images);
  const imageUrl = `/api/maintenance/${id}/images/${filename}`;
  const updated = [...existing, imageUrl];

  await prisma.maintenanceTicket.update({
    where: { id },
    data: { images: JSON.stringify(updated) },
  });

  return NextResponse.json({ success: true, url: imageUrl, images: updated }, { status: 201 });
}
