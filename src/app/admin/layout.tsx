import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AdminLayoutClient from "./AdminLayoutClient";
import AdminIdleLogout from "./AdminIdleLogout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify the caller has an ACTIVE profile. This mirrors the DB
  // `is_active_profile` rule; the RLS policies are the real guard, this is a
  // presentation-layer gate so inactive users never reach the admin UI.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, account_status, employment_start, employment_end")
    .eq("user_id", user.id)
    .maybeSingle();

  // Current date in Europe/Stockholm (matches the DB function's timezone).
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Stockholm",
  }); // YYYY-MM-DD

  const active =
    !!profile &&
    profile.is_active === true &&
    profile.account_status === "active" &&
    (profile.employment_start == null || profile.employment_start <= today) &&
    (profile.employment_end == null || profile.employment_end >= today);

  // No profile OR suspended/ended/deactivated/outside employment window.
  if (!profile || !active) {
    redirect("/login");
  }

  const role: "admin" | "staff" = profile.role === "admin" ? "admin" : "staff";

  return (
    <AdminLayoutClient userEmail={user.email} role={role}>
      <AdminIdleLogout />
      {children}
    </AdminLayoutClient>
  );
}
