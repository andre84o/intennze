import { requireCommissionAccessPage } from "@/lib/auth/adminGuard";
import { todayStockholm } from "@/lib/auth/activeProfile";
import ProvisionClient from "./ProvisionClient";

/**
 * /admin/sales — Commission ("Provision") area.
 *
 * Access (RESOLVED): active Admin always, OR active Staff with
 * commission_eligible=true. Ineligible active staff → /admin; unauth/inactive →
 * /login. The gate lives in requireCommissionAccessPage(); every server action
 * re-verifies the caller independently.
 */
export default async function ProvisionPage() {
  const { isAdmin, commissionEligible } = await requireCommissionAccessPage();

  // Default month = current Stockholm month ("YYYY-MM").
  const initialMonth = todayStockholm().slice(0, 7);

  // "Mina siffror" shows for any commission-eligible user (all eligible staff,
  // and admins only when their own profile is commission_eligible).
  const showMyNumbers = commissionEligible;

  return (
    <ProvisionClient
      isAdmin={isAdmin}
      showMyNumbers={showMyNumbers}
      initialMonth={initialMonth}
    />
  );
}
