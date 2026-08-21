import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  redirect("/intelligence?view=analytics");
}
