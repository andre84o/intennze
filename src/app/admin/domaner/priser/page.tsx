import { requireAdminPage } from "@/lib/auth/adminGuard";
import { listPricingRules } from "@/lib/domains/pricing-service";
import PricingRulesClient from "./PricingRulesClient";

export const metadata = { title: "Domänpriser | Admin" };

export default async function DomainPricingPage() {
  await requireAdminPage();
  const res = await listPricingRules();
  const rules = res.ok ? res.data : [];
  const error = res.ok ? null : res.error;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Domänpriser</h1>
        <p className="text-gray-500">
          Konfigurera Intennzes kundpriser ovanpå Hostups leverantörspriser. Belopp anges i
          minsta valutaenhet (öre) och lagras exklusive moms.
        </p>
      </div>
      <PricingRulesClient initialRules={rules} initialError={error} />
    </div>
  );
}
