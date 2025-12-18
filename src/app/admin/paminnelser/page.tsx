import { createClient } from "@/utils/supabase/server";
import RemindersClient from "./RemindersClient";

export const metadata = {
  title: "Påminnelser | Admin",
};

export default async function RemindersPage() {
  const supabase = await createClient();

  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("*, customer:customers(*)")
    .order("reminder_date", { ascending: true });

  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name, company_name")
    .order("first_name", { ascending: true });

  return (
    <RemindersClient
      initialReminders={reminders || []}
      customers={customers || []}
      error={error?.message}
    />
  );
}
