import Link from "next/link";
import { getCheckoutSummary } from "@/lib/domains/checkout-service";
import CheckoutClient from "./CheckoutClient";

export const metadata = { title: "Kundkorg | Portal" };

/**
 * Domain cart + checkout. Reads the reserved cart and shows the SERVER-recomputed
 * prices (never a browser value). "Betala" opens a Stripe TEST-mode session for
 * the whole cart. No live payment, no Hostup order is created.
 */
export default async function CheckoutPage() {
  const res = await getCheckoutSummary();

  if (!res.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Kundkorg</h1>
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {res.error}
        </div>
        <Link
          href="/portal/domains/search"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
        >
          Sök en domän
        </Link>
      </div>
    );
  }

  const s = res.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Kundkorg</h1>

      {s.isCustomerView && (
        <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Du visar portalen i kundvy. Betalning kan endast göras av kunden själv.
        </div>
      )}

      <CheckoutClient
        items={s.items}
        currencyCode={s.currencyCode}
        totalVatMinor={s.totalVatMinor}
        totalGrossMinor={s.totalGrossMinor}
        isCustomerView={s.isCustomerView}
        registrant={s.registrant}
        missingFields={s.missingFields}
      />

      <p className="text-xs text-slate-400">
        Testläge: ingen riktig betalning genomförs och ingen domän registreras i detta steg.
      </p>
    </div>
  );
}
