import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult as NextResponse;

  const { id } = await params;
  const prisma = getPrismaClient();

  const filing = await prisma.taxFiling.findUnique({ where: { id } });
  if (!filing || filing.userId !== authResult.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.taxFiling.delete({ where: { id } });
  return NextResponse.json({ data: { deleted: true } });
}
