import Link from "next/link";

export const metadata = { title: "Tack | Portal" };

/**
 * Post-checkout return page. The success URL is NEVER trusted as proof of payment
 * — orders settle only via the verified webhook. We link to the orders list where
 * each order shows its live DB status.
 */
export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900" tabIndex={-1}>
        Tack för din beställning
      </h1>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700 shadow-sm">
        Betalningen tas emot och dina beställningar uppdateras strax.
      </div>

      <Link
        href="/portal/domains/orders"
        className="inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
      >
        Visa beställningar
      </Link>

      <p className="text-xs text-slate-400">
        Testläge: ingen riktig betalning har genomförts och ingen domän har registrerats.
      </p>
    </div>
  );
}
