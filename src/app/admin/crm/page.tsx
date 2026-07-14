import { createClient } from "@/utils/supabase/server";
import SalesClient from "./SalesClient";
import { type MyReminderRow } from "./MyReminders";

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

  // The logged-in user's OWN active reminders (per individual), shown on CRM.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let myReminders: MyReminderRow[] = [];
  if (user) {
    const { data: mine } = await supabase
      .from("reminders")
      .select(
        "id, title, reminder_date, reminder_time, type, customer:customers(company_name, first_name, last_name)"
      )
      .eq("created_by", user.id)
      .eq("is_completed", false)
      .order("reminder_date", { ascending: true });

    type Row = {
      id: string;
      title: string;
      reminder_date: string;
      reminder_time: string | null;
      type: string | null;
      customer:
        | { company_name: string | null; first_name: string | null; last_name: string | null }
        | { company_name: string | null; first_name: string | null; last_name: string | null }[]
        | null;
    };
    myReminders = ((mine ?? []) as unknown as Row[]).map((r) => {
      const c = Array.isArray(r.customer) ? r.customer[0] : r.customer;
      const name = c
        ? c.company_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || null
        : null;
      return {
        id: r.id,
        title: r.title,
        reminder_date: r.reminder_date,
        reminder_time: r.reminder_time,
        type: r.type,
        customerName: name,
      };
    });
  }

  return (
    <SalesClient
      customers={customers || []}
      reminders={reminders || []}
      interactions={interactions || []}
      questionnaires={questionnaires || []}
      quotes={quotes || []}
      myReminders={myReminders}
      isAdmin={isAdmin === true}
      error={error?.message}
    />
  );
}
