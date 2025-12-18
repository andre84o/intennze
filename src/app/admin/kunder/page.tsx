import { createClient } from "@/utils/supabase/server";
import CustomersClient from "./CustomersClient";

export const metadata = {
  title: "Kunder | Admin",
};

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: reminders } = await supabase
    .from("reminders")
    .select("*, customer:customers(*)")
    .eq("is_completed", false)
    .gte("reminder_date", new Date().toISOString().split("T")[0])
    .order("reminder_date", { ascending: true })
    .limit(10);

  return (
    <CustomersClient
      initialCustomers={customers || []}
      upcomingReminders={reminders || []}
      error={error?.message}
    />
  );
}
