import { redirect } from "next/navigation";

export default async function MaintenancePage() {
  redirect("/operations");
}
