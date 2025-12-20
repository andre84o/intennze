import { createClient } from "@/utils/supabase/server";
import SalesClient from "./SalesClient";

export const metadata = {
  title: "Försäljning | Admin",
};

export default async function SalesPage() {
  const supabase = await createClient();

  // Hämta alla kunder med alla fält
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  // Hämta alla påminnelser
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .order("reminder_date", { ascending: true });

  // Hämta alla interaktioner
  const { data: interactions } = await supabase
    .from("customer_interactions")
    .select("*")
    .order("created_at", { ascending: false });

  // Hämta alla formulär
  const { data: questionnaires } = await supabase
    .from("questionnaires")
    .select("id, customer_id, status")
    .order("created_at", { ascending: false });

  return (
    <SalesClient
      customers={customers || []}
      reminders={reminders || []}
      interactions={interactions || []}
      questionnaires={questionnaires || []}
      error={error?.message}
    />
  );
}
