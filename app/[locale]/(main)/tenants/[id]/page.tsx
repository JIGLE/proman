import { redirect } from "next/navigation";

export default async function TenantDetailRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(`/${locale}/people/${id}`);
}
