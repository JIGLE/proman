import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BuildingsPage({ params }: { params: Promise<{ locale: string }> }) {
  // Buildings management is now integrated into the Properties page.
  void params;
  redirect("../portfolio");
}
