import { requireAdminPage } from "@/lib/auth/adminGuard";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  await requireAdminPage();

  return <SettingsClient />;
}
