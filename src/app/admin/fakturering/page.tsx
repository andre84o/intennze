import { createClient } from "@/utils/supabase/server";
import { requireAdminPage } from "@/lib/auth/adminGuard";
import { getEligibleSalespeople } from "./actions";
import InvoicesClient from "./InvoicesClient";

export default async function InvoicesPage() {
  await requireAdminPage();

  const supabase = await createClient();

  // Active, commission-eligible sellers for the "confirm paid" dialog.
  const eligible = await getEligibleSalespeople();

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
      salespeople={eligible.ok ? eligible.salespeople : []}
      error={invoicesError?.message || customersError?.message}
    />
  );
}
