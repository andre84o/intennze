import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import CustomerDetailClient from "./CustomerDetailClient";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch customer
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !customer) {
    notFound();
  }

  // Fetch interactions
  const { data: interactions } = await supabase
    .from("customer_interactions")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  // Fetch purchases
  const { data: purchases } = await supabase
    .from("purchases")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  // Fetch reminders
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("customer_id", id)
    .order("reminder_date", { ascending: true });

  // Fetch quotes
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  return (
    <CustomerDetailClient
      customer={customer}
      interactions={interactions || []}
      purchases={purchases || []}
      reminders={reminders || []}
      quotes={quotes || []}
    />
  );
}
