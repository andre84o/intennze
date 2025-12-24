import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import QuoteResponseClient from "./QuoteResponseClient";

export const metadata = {
  title: "Offert | intenzze",
};

// Use anon key with RLS policies for public access (secure)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Fetch quote by public_token
  const { data: quote, error } = await supabase
    .from("quotes")
    .select(`
      *,
      customer:customers(first_name, last_name, company_name, email),
      items:quote_items(*)
    `)
    .eq("public_token", token)
    .single();

  if (error || !quote) {
    notFound();
  }

  // Sort items by sort_order
  if (quote.items) {
    quote.items.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
  }

  return <QuoteResponseClient quote={quote} token={token} />;
}
