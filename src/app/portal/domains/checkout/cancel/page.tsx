import Link from "next/link";

export const metadata = { title: "Avbruten | Portal" };

/**
 * Checkout cancelled. No status is mutated here — an abandoned Stripe session is
 * reconciled to EXPIRED by the webhook. Nothing has been charged.
 */
export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900" tabIndex={-1}>
        Betalningen avbröts
      </h1>
      <p className="text-slate-500">Inget har debiterats. Du kan försöka igen när du vill.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/portal/domains/checkout"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
        >
          Till kassan igen
        </Link>
        <Link
          href="/portal/domains/search"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
        >
          Sök en domän
        </Link>
      </div>
    </div>
  );
}
