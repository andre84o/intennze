import { createClient } from "@/utils/supabase/server";
import KoderClient from "./KoderClient";

export const metadata = {
  title: "Koder | Admin",
};

export default async function KoderPage() {
  const supabase = await createClient();

  const { data: snippets, error } = await supabase
    .from("code_snippets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <KoderClient
      initialSnippets={snippets || []}
      error={error?.message}
    />
  );
}
