import { requireAdminPage } from "@/lib/auth/adminGuard";
import { todayStockholm } from "@/lib/auth/activeProfile";
import SalesClient from "./SalesClient";

/**
 * /admin/sales — commission COMPANY OVERVIEW (admin only).
 *
 * Individual "Mina siffror" moved to the /admin Dashboard (see <MyCommission/>).
 * Access: active Admin only (requireAdminPage → non-admins to /admin, unauth to
 * /login). Every server action re-verifies the caller independently.
 */
export default async function SalesPage() {
  await requireAdminPage();
  const initialMonth = todayStockholm().slice(0, 7);
  return <SalesClient isAdmin initialMonth={initialMonth} />;
}
