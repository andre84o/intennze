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

  return (
    <AdminLayoutClient userEmail={user.email}>
      <AdminIdleLogout />
      {children}
    </AdminLayoutClient>
  );
}
