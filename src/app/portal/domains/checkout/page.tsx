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
        <h1 className="text-2xl font-bold text-white">Kassa</h1>
        <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {res.error}
        </div>
        <Link
          href="/portal/domains/search"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
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
        <h1 className="text-2xl font-bold text-white">Kassa</h1>
        <p className="text-slate-400">Granska din beställning innan du betalar. Betalning sker i testläge.</p>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Domän</dt>
            <dd className="font-medium text-white">{s.domainName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Åtgärd</dt>
            <dd className="text-slate-200">{operationLabel(s.operation)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Period</dt>
            <dd className="text-slate-200">{s.years} år</dd>
          </div>

          {priced ? (
            <>
              <div className="mt-2 flex justify-between gap-4 border-t border-slate-800 pt-3">
                <dt className="text-slate-400">Pris exkl. moms</dt>
                <dd className="text-slate-200">{formatMinor(s.netAmountMinor, s.currencyCode)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Moms</dt>
                <dd className="text-slate-200">{formatMinor(s.vatAmountMinor, s.currencyCode)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-800 pt-3 text-base">
                <dt className="font-medium text-slate-300">Totalt</dt>
                <dd className="font-bold text-white">{formatMinor(s.grossAmountMinor, s.currencyCode)}</dd>
              </div>
            </>
          ) : (
            <div className="mt-2 border-t border-slate-800 pt-3 text-amber-300">
              Priset för denna domän är inte konfigurerat ännu. Kontakta oss så hjälper vi dig.
            </div>
          )}
        </dl>
      </div>

      <CheckoutClient canPay={priced} />

      <p className="text-xs text-slate-500">
        Testläge: ingen riktig betalning genomförs och ingen domän registreras i detta steg.
      </p>
    </div>
  );
}
