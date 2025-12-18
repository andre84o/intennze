import { createClient } from "@/utils/supabase/server";
import QuotesClient from "./QuotesClient";

export const metadata = {
  title: "Offerter | Admin",
};

export default async function QuotesPage() {
  const supabase = await createClient();

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("*, customer:customers(*), items:quote_items(*)")
    .order("created_at", { ascending: false });

  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name, company_name, email")
    .order("first_name", { ascending: true });

  return (
    <QuotesClient
      initialQuotes={quotes || []}
      customers={customers || []}
      error={error?.message}
    />
  );
}
