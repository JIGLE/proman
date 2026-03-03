import { redirect } from "next/navigation";

export default async function Home() {
  // If user is authenticated, go straight to dashboard
  try {
    const { getServerSession } = await import("next-auth/next");
    const { getAuthOptions } = await import("@/lib/services/auth/auth");
    const session = await getServerSession(getAuthOptions());
    if (session?.user) {
      redirect("/pt/overview");
    }
  } catch (e) {
    // redirect() throws a special error — re-throw it
    if (e && typeof e === "object" && "digest" in e) throw e;
  }
  redirect("/pt");
}
