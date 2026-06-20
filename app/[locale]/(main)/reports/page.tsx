import { redirect } from "next/navigation";

// Reports is now a tab within the unified Insights destination.
export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/insights?tab=reports`);
}
