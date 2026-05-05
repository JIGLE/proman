import { redirect } from "next/navigation";
import { defaultLocale } from "@/lib/i18n/config";

export default async function Home() {
  // If user is authenticated, go straight to dashboard
  try {
    const { getServerSession } = await import("next-auth/next");
    const { getAuthOptions } = await import("@/lib/services/auth/auth");
    const session = await getServerSession(getAuthOptions());
    if (session?.user) {
      redirect(`/${defaultLocale}/dashboard`);
    }
  } catch (e) {
    // redirect() throws a special error — re-throw it
    if (e && typeof e === "object" && "digest" in e) throw e;
  }
  redirect(`/${defaultLocale}`);
}
