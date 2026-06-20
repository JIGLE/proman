import { redirect } from "next/navigation";

// Analytics is now a tab within the unified Insights destination.
export default async function AnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/insights?tab=analytics`);
}
