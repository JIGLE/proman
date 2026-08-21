import { redirect } from "next/navigation";

export default async function TenantsRedirectPage() {
  redirect("/people");
}
