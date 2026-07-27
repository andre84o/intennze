import Link from "next/link";

export const metadata = { title: "Avbruten | Portal" };

/**
 * Checkout cancelled. No status is mutated here — an abandoned Stripe session is
 * reconciled to EXPIRED by the webhook. Nothing has been charged.
 */
export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <h1 className="text-2xl font-bold text-white" tabIndex={-1}>
        Betalningen avbröts
      </h1>
      <p className="text-slate-400">Inget har debiterats. Du kan försöka igen när du vill.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/portal/domains/checkout"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Till kassan igen
        </Link>
        <Link
          href="/portal/domains/search"
          className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          Sök en domän
        </Link>
      </div>
    </div>
  );
}
