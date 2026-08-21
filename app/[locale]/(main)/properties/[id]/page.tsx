import { redirect } from "next/navigation";

export default async function PropertyDetailRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  redirect(`/portfolio/${id}`);
}
