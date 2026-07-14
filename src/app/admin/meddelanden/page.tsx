import { requireAdminPage } from "@/lib/auth/adminGuard";
import MessagesClient from "./MessagesClient";

export default async function MessagesPage() {
  await requireAdminPage();

  return <MessagesClient />;
}
