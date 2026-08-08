import { redirect } from "next/navigation";
import { getPreferredLocale } from "@/lib/i18n/server-locale";

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
