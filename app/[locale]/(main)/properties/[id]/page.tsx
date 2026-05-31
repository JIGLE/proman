import { redirect } from "next/navigation";

export default async function PropertyDetailRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(`/${locale}/portfolio/${id}`);
}
