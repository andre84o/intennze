"use server";

import { createClient } from "@supabase/supabase-js";

export async function lookupEmailByUsername(username: string): Promise<string | null> {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await adminClient
    .from("user_preferences")
    .select("user_id")
    .eq("username", username.toLowerCase().trim())
    .single();

  if (error || !data) return null;

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(data.user_id);
  if (userError || !userData.user) return null;

  return userData.user.email ?? null;
}
