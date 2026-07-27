import { requireAdminPage } from "@/lib/auth/adminGuard";
import { listPricingRules, getTldOptionsForAdmin } from "@/lib/domains/pricing-service";
import PricingRulesClient from "./PricingRulesClient";

export const metadata = { title: "Domänpriser | Admin" };

export default async function DomainPricingPage() {
  await requireAdminPage();
  const [rulesRes, tldRes] = await Promise.all([listPricingRules(), getTldOptionsForAdmin()]);
  const rules = rulesRes.ok ? rulesRes.data : [];
  const error = rulesRes.ok ? null : rulesRes.error;
  const tldOptions = tldRes.ok ? tldRes.data : [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Domänpriser</h1>
      </div>
      <PricingRulesClient initialRules={rules} initialError={error} tldOptions={tldOptions} />
    </div>
  );
}
