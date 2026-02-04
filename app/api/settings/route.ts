import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    
    const { userId } = authResult;

    const prisma = getPrismaClient();
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Failed to get settings:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    
    const { userId } = authResult;

    const data = await request.json();

    const prisma = getPrismaClient();
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        theme: data.theme,
        language: data.language,
        defaultCurrency: data.defaultCurrency,
        defaultTaxCountry: data.defaultTaxCountry,
        emailNotifications: data.emailNotifications,
        taxReminderNotifications: data.taxReminderNotifications,
        distributionNotifications: data.distributionNotifications,
      },
      create: {
        userId,
        theme: data.theme,
        language: data.language,
        defaultCurrency: data.defaultCurrency,
        defaultTaxCountry: data.defaultTaxCountry,
        emailNotifications: data.emailNotifications,
        taxReminderNotifications: data.taxReminderNotifications,
        distributionNotifications: data.distributionNotifications,
      },
    });

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
