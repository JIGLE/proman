import { redirect } from "next/navigation";

export default async function PropertiesRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/portfolio`);
}
