import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { withRateLimit } from "@/lib/utils/rate-limit";
import { fileTypeFromBuffer } from "file-type";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// Upload security: magic-byte validation (file-type), 5 MB max, 20 images/ticket,
// 500 MB per-user quota, rate-limited. Extension derived from magic bytes, not filename.

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES_PER_TICKET = 20;
const USER_QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getUploadBase(): string {
  return process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(process.cwd(), "uploads");
}

function getUploadDir(ticketId: string): string {
  return path.join(getUploadBase(), "maintenance", ticketId);
}

function parseImages(raw: unknown): string[] {
  if (typeof raw === "string") return JSON.parse(raw) as string[];
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

/**
 * Sum the total bytes stored across all maintenance upload dirs for a given user.
 * Looks up all ticket IDs owned by the user then stats each file in their dirs.
 */
async function getUserStorageBytes(userId: string): Promise<number> {
  const prisma = getPrismaClient();
  const tickets = await prisma.maintenanceTicket.findMany({
    where: { userId },
    select: { id: true },
  });

  const base = path.join(getUploadBase(), "maintenance");
  let total = 0;

  for (const { id } of tickets) {
    const dir = path.join(base, id);
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        try {
          const stat = fs.statSync(path.join(dir, file));
          if (stat.isFile()) total += stat.size;
        } catch {
          // skip unreadable files
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  return total;
}

async function handlePost(
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

  // Per-ticket image limit
  const existing = parseImages(ticket.images);
  if (existing.length >= MAX_IMAGES_PER_TICKET) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES_PER_TICKET} images per ticket.` },
      { status: 422 },
    );
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

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 413 });
  }

  // Read buffer and validate via magic bytes (not browser-reported MIME type)
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    return NextResponse.json(
      { error: "File content does not match an allowed image type." },
      { status: 415 },
    );
  }

  // Per-user storage quota
  const currentUsage = await getUserStorageBytes(userId);
  if (currentUsage + file.size > USER_QUOTA_BYTES) {
    return NextResponse.json(
      { error: "Storage quota exceeded. Maximum 500 MB per user." },
      { status: 413 },
    );
  }

  const uploadDir = getUploadDir(id);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // Use magic-byte-detected extension, not the original browser filename
  const ext = detected.ext;
  const filename = `${randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  const imageUrl = `/api/maintenance/${id}/images/${filename}`;
  const updated = [...existing, imageUrl];

  await prisma.maintenanceTicket.update({
    where: { id },
    data: { images: JSON.stringify(updated) },
  });

  return NextResponse.json({ success: true, url: imageUrl, images: updated }, { status: 201 });
}

export const POST = withRateLimit(handlePost);
