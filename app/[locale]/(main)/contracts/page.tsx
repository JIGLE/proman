import { redirect } from "next/navigation";

export default async function ContractsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/leases`);
}
