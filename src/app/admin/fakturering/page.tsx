import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InvoicesClient from "./InvoicesClient";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all invoices with customer data
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("*, customer:customers(*)")
    .order("invoice_date", { ascending: false });

  // Fetch customers with service agreements
  const { data: customersWithService, error: customersError } = await supabase
    .from("customers")
    .select("*")
    .eq("has_service_agreement", true)
    .not("service_price", "is", null);

  // Fetch all customers for one-time invoices
  const { data: allCustomers } = await supabase
    .from("customers")
    .select("*")
    .order("first_name", { ascending: true });

  return (
    <InvoicesClient
      initialInvoices={invoices || []}
      customersWithService={customersWithService || []}
      allCustomers={allCustomers || []}
      error={invoicesError?.message || customersError?.message}
    />
  );
}
