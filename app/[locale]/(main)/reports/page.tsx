import { redirect } from "next/navigation";

export default async function ReportsPage() {
  redirect("/intelligence?view=reports");
}
