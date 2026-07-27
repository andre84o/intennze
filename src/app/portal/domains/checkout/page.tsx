import Link from "next/link";
import { getCheckoutSummary } from "@/lib/domains/checkout-service";
import { formatMinor } from "@/lib/domains/money";
import { operationLabel } from "../orders/ui";
import CheckoutClient from "./CheckoutClient";

export const metadata = { title: "Kassa | Portal" };

/**
 * Domain checkout. Reads the prepared quote and shows the SERVER-recomputed price
 * (never a browser value). The "Betala" button opens a Stripe TEST-mode session.
 * No live payment, no Hostup order is created.
 */
export default async function CheckoutPage() {
  const res = await getCheckoutSummary();

  if (!res.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Kassa</h1>
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
  const priced = s.priceConfigured && s.netAmountMinor != null && s.grossAmountMinor != null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Kassa</h1>
        <p className="text-slate-500">Granska din beställning innan du betalar. Betalning sker i testläge.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Domän</dt>
            <dd className="font-medium text-slate-900">{s.domainName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Åtgärd</dt>
            <dd className="text-slate-700">{operationLabel(s.operation)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Period</dt>
            <dd className="text-slate-700">{s.years} år</dd>
          </div>

          {priced ? (
            <>
              <div className="mt-2 flex justify-between gap-4 border-t border-slate-200 pt-3">
                <dt className="text-slate-500">Pris exkl. moms</dt>
                <dd className="text-slate-700">{formatMinor(s.netAmountMinor, s.currencyCode)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Moms</dt>
                <dd className="text-slate-700">{formatMinor(s.vatAmountMinor, s.currencyCode)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                <dt className="font-medium text-slate-600">Totalt</dt>
                <dd className="font-semibold text-slate-900">{formatMinor(s.grossAmountMinor, s.currencyCode)}</dd>
              </div>
            </>
          ) : (
            <div className="mt-2 border-t border-slate-200 pt-3 text-amber-700">
              Priset för denna domän är inte konfigurerat ännu. Kontakta oss så hjälper vi dig.
            </div>
          )}
        </dl>
      </div>

      {s.isCustomerView && (
        <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Du visar portalen i kundvy. Betalning kan endast göras av kunden själv.
        </div>
      )}

      <CheckoutClient
        canPay={priced}
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
