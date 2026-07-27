import Link from "next/link";
import { listCustomerDomainOrders } from "@/lib/domains/checkout-service";
import { formatMinor } from "@/lib/domains/money";
import { OrderStatusBadge, formatOrderDate, operationLabel } from "./ui";

export const metadata = { title: "Beställningar | Portal" };

/**
 * The customer's domain orders. Ownership-scoped server-side; provider price and
 * Stripe ids are never exposed. Responsive: cards on mobile, table on desktop.
 */
export default async function OrdersPage() {
  const res = await listCustomerDomainOrders();

  if (!res.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Beställningar</h1>
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Kunde inte ladda dina beställningar just nu.
        </div>
      </div>
    );
  }

  const orders = res.data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Beställningar</h1>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <p className="text-slate-700">Du har inga beställningar ännu.</p>
          <Link
            href="/portal/domains/search"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
          >
            Sök en domän
          </Link>
        </div>
      ) : (
        <section aria-label="Dina beställningar">
          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/portal/domains/orders/${o.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white shadow-sm p-5 motion-safe:transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{o.domainName}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Period</dt>
                      <dd className="text-slate-700">{o.years} år</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Totalt</dt>
                      <dd className="text-slate-700">{formatMinor(o.grossAmountMinor, o.currencyCode)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Beställd</dt>
                      <dd className="text-slate-700">{formatOrderDate(o.createdAt)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Domän</th>
                  <th scope="col" className="px-4 py-3 font-medium">Åtgärd</th>
                  <th scope="col" className="px-4 py-3 font-medium">Totalt</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Beställd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/portal/domains/orders/${o.id}`} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                        {o.domainName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{operationLabel(o.operation)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatMinor(o.grossAmountMinor, o.currencyCode)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-slate-700">{formatOrderDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
