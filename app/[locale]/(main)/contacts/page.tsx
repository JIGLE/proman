import { redirect } from "next/navigation";

export default async function ContactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/tenants?view=contacts`);
}
