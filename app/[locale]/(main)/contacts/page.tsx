import { redirect } from "next/navigation";

export default async function ContactsPage() {
  redirect("/people?view=contacts");
}
