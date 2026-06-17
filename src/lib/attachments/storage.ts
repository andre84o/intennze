// Client-side helpers for the private "attachments" bucket.
// Files are private — they are only ever exposed through short-lived signed URLs.

import { createClient } from "@/utils/supabase/client";
import type { Attachment } from "@/types/database";
import { ATTACHMENTS_BUCKET, SIGNED_URL_TTL } from "./constants";

// Batch-create signed URLs, returned as a { storage_path: url } map.
export async function getSignedUrls(
  paths: string[],
  expiresIn = SIGNED_URL_TTL
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = createClient();
  const { data } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrls(paths, expiresIn);
  const map: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}

export async function getSignedUrl(path: string, expiresIn = SIGNED_URL_TTL): Promise<string | null> {
  const map = await getSignedUrls([path], expiresIn);
  return map[path] ?? null;
}

// Removes both the storage object and the DB row. Returns an error message or null.
export async function deleteAttachment(att: Attachment): Promise<string | null> {
  const supabase = createClient();
  await supabase.storage.from(ATTACHMENTS_BUCKET).remove([att.storage_path]);
  const { error } = await supabase.from("attachments").delete().eq("id", att.id);
  return error ? error.message : null;
}
