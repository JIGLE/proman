import { redirect } from "next/navigation";

export default async function OwnersPage() {
  redirect("/people?view=owners");
}
