import { createClient } from "@/utils/supabase/server";
import SalesClient from "./SalesClient";

export const metadata = {
  title: "CRM | Admin",
};

export default async function SalesPage() {
  const supabase = await createClient();

  // Whether the caller is an admin — used to gate the delete-note control in
  // the UI. This is defense-in-depth only; the authoritative gate is the RLS
  // policy on customer_interactions (DELETE requires public.is_admin()).
  const { data: isAdmin } = await supabase.rpc("is_admin");

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

  // Hämta alla offerter med rader och kund
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*, customer:customers(*), items:quote_items(*)")
    .order("created_at", { ascending: false });

  return (
    <SalesClient
      customers={customers || []}
      reminders={reminders || []}
      interactions={interactions || []}
      questionnaires={questionnaires || []}
      quotes={quotes || []}
      isAdmin={isAdmin === true}
      error={error?.message}
    />
  );
}
