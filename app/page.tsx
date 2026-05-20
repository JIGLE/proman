import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { defaultLocale, locales } from "@/lib/i18n/config";

async function getPreferredLocale(): Promise<string> {
  const cookieStore = await cookies();
  const saved = cookieStore.get("proman-locale")?.value;
  return saved && (locales as readonly string[]).includes(saved) ? saved : defaultLocale;
}

export default async function Home() {
  const locale = await getPreferredLocale();

  // If user is authenticated, go straight to dashboard
  try {
    const { getServerSession } = await import("next-auth/next");
    const { getAuthOptions } = await import("@/lib/services/auth/auth");
    const session = await getServerSession(getAuthOptions());
    if (session?.user) {
      redirect(`/${locale}/dashboard`);
    }
  } catch (e) {
    // redirect() throws a special error — re-throw it
    if (e && typeof e === "object" && "digest" in e) throw e;
  }
  redirect(`/${locale}`);
}
