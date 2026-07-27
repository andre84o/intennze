import Link from "next/link";
import { getCustomerDomainOrder } from "@/lib/domains/checkout-service";
import OrderStatusClient from "../../orders/OrderStatusClient";

export const metadata = { title: "Tack | Portal" };

/**
 * Post-checkout return page. The success URL is NEVER trusted as proof of
 * payment — the order is looked up with ownership enforced and its DB status is
 * shown (the paid state is set only by the verified webhook). While pending, the
 * status client polls until it settles.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const res = order ? await getCustomerDomainOrder(order) : null;

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900" tabIndex={-1}>
        Tack för din beställning
      </h1>

      {!res || !res.ok ? (
        <p className="text-slate-500">
          Vi kunde inte hitta beställningen. Kontrollera dina{" "}
          <Link href="/portal/domains/orders" className="text-blue-600 hover:text-blue-700 hover:underline">
            beställningar
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <p className="font-medium text-slate-900">{res.data.domainName}</p>
            <div className="mt-3 flex justify-center">
              <OrderStatusClient orderId={res.data.id} initialStatus={res.data.status} />
            </div>
          </div>
          <Link
            href={`/portal/domains/orders/${res.data.id}`}
            className="inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
          >
            Visa beställningen
          </Link>
        </>
      )}

      <p className="text-xs text-slate-400">
        Testläge: ingen riktig betalning har genomförts och ingen domän har registrerats.
      </p>
    </div>
  );
}
