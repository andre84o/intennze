import { createClient } from "@/utils/supabase/server";
import { requireAdminPage } from "@/lib/auth/adminGuard";
import { Attachment } from "@/types/database";
import KoderClient from "./KoderClient";

export const metadata = {
  title: "Koder | Admin",
};

export default async function KoderPage() {
  await requireAdminPage();

  const supabase = await createClient();

  const { data: snippets, error } = await supabase
    .from("code_snippets")
    .select("*")
    .order("created_at", { ascending: false });

  const snippetIds = (snippets || []).map((s) => s.id);
  let attachments: Attachment[] = [];
  if (snippetIds.length > 0) {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("entity_type", "code_snippet")
      .in("entity_id", snippetIds)
      .order("created_at", { ascending: true });
    attachments = data || [];
  }

  return (
    <KoderClient
      initialSnippets={snippets || []}
      initialAttachments={attachments}
      error={error?.message}
    />
  );
}
