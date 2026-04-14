import { redirect } from "next/navigation";

export default async function OwnersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/tenants?view=owners`);
}
