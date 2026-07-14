import { createClient } from "@/utils/supabase/server";
import { requireAdminPage } from "@/lib/auth/adminGuard";
import { listStaff } from "./actions";
import StaffClient from "./StaffClient";

export const metadata = {
  title: "Staff | Admin",
};

export default async function StaffPage() {
  // Server-side admin gate: unauthenticated -> /login, non-admin -> /admin.
  await requireAdminPage();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // listStaff() re-verifies admin server-side and returns plain data objects.
  const result = await listStaff();

  return (
    <StaffClient
      staff={result.ok ? result.staff : []}
      currentUserId={user!.id}
      error={result.ok ? undefined : result.error}
    />
  );
}
