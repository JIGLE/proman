import { redirect } from "next/navigation";

export default async function TenantDetailRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  redirect(`/people/${id}`);
}
