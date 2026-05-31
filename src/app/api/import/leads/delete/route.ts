export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  // 1. Auth + admin check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
  }
  const adminEmail = process.env.CONTACT_TO;
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: "Ej behörig" }, { status: 403 });
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
  }

  const { batchId } =
    body !== null && typeof body === "object" ? (body as Record<string, unknown>) : {};

  if (typeof batchId !== "string" || !UUID_RE.test(batchId)) {
    return NextResponse.json({ error: "Ogiltigt batchId" }, { status: 400 });
  }

  // 3. Fetch batch to get storage_path
  const { data: batch, error: fetchError } = await supabase
    .from("lead_import_batches")
    .select("storage_path")
    .eq("id", batchId)
    .single();

  if (fetchError || !batch) {
    return NextResponse.json({ error: "Importen hittades inte" }, { status: 404 });
  }

  // 4. Best-effort remove Storage file
  if (batch.storage_path) {
    await supabase.storage.from("lead-imports").remove([batch.storage_path]);
    // Errors are intentionally ignored — orphaned files are acceptable
  }

  // 5. Delete DB row (RLS DELETE policy required: auth.uid() = created_by)
  const { error: deleteError } = await supabase
    .from("lead_import_batches")
    .delete()
    .eq("id", batchId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Kunde inte radera importen" },
      { status: 500 }
    );
  }

  // 6. Revalidate settings page so ImportHistoryCard refreshes
  revalidatePath("/admin/installningar");

  // 7. Return success
  return NextResponse.json({ success: true });
}
