import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import LeadsClient, { Lead, AssignableUser } from "./LeadsClient";

export const metadata = {
  title: "Leads | Admin",
};

export default async function LeadsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Server-side admin gate. The admin layout only checks that a user is
  // logged in, so we MUST verify the role here ourselves.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || profile.is_active !== true) {
    redirect("/admin");
  }

  // Fetch leads. RLS also enforces admin-only SELECT on lead_inbox.
  const { data: leads, error } = await supabase
    .from("lead_inbox")
    .select(
      "id, created_at, source, external_id, status, name, email, phone, company, message, assigned_to, assigned_at, customer_id, is_read"
    )
    .order("created_at", { ascending: false });

  // Fetch assignable users (active admin/staff). profiles has no name columns,
  // so we join to auth.users for the email — reachable only via service role.
  const assignableUsers = await getAssignableUsers();

  return (
    <LeadsClient
      leads={(leads ?? []) as Lead[]}
      assignableUsers={assignableUsers}
      error={error?.message}
    />
  );
}

/**
 * Read active admin/staff from profiles and their emails from auth.users.
 * auth.users is NOT reachable via the anon/session client, so we use the
 * service-role client here — SERVER ONLY. Admin is already verified above.
 */
async function getAssignableUsers(): Promise<AssignableUser[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];

  const admin = createServiceClient(url, serviceKey);

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, role")
    .eq("is_active", true)
    .in("role", ["admin", "staff"]);

  if (!profiles || profiles.length === 0) return [];

  const { data: usersPage } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const emailById = new Map<string, string>();
  for (const u of usersPage?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  return profiles
    .map((p) => ({
      user_id: p.user_id as string,
      email: emailById.get(p.user_id as string) ?? "",
      role: p.role as string,
    }))
    .filter((u) => u.email)
    .sort((a, b) => a.email.localeCompare(b.email));
}
