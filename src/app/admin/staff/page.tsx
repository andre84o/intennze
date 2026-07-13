import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { listStaff } from "./actions";
import StaffClient from "./StaffClient";

export const metadata = {
  title: "Staff | Admin",
};

export default async function StaffPage() {
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

  // listStaff() re-verifies admin server-side and returns plain data objects.
  const result = await listStaff();

  return (
    <StaffClient
      staff={result.ok ? result.staff : []}
      currentUserId={user.id}
      error={result.ok ? undefined : result.error}
    />
  );
}
