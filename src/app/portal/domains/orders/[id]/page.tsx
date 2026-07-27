import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDomainOrder } from "@/lib/domains/checkout-service";
import { formatMinor } from "@/lib/domains/money";
import { formatOrderDate, operationLabel } from "../ui";
import OrderStatusClient from "../OrderStatusClient";

export const metadata = { title: "Beställning | Portal" };

/**
 * One order's detail, ownership-verified server-side (404 if not the customer's).
 * Shows domän/period/net/vat/gross + live status. Stripe ids are never exposed.
 */
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getCustomerDomainOrder(id);

  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <div className="space-y-6">
        <BackLink />
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Kunde inte ladda beställningen just nu.
        </div>
      </div>
    );
  }

  const o = res.data;

  return (
    <div className="space-y-6">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">{o.domainName}</h1>
          <p className="text-sm text-slate-400">Beställd {formatOrderDate(o.createdAt)}</p>
        </div>
        <OrderStatusClient orderId={o.id} initialStatus={o.status} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <dl className="space-y-3 text-sm">
          <Row label="Åtgärd" value={operationLabel(o.operation)} />
          <Row label="Period" value={`${o.years} år`} />
          <div className="border-t border-slate-800 pt-3" />
          <Row label="Pris exkl. moms" value={formatMinor(o.netAmountMinor, o.currencyCode)} />
          <Row label="Moms" value={formatMinor(o.vatAmountMinor, o.currencyCode)} />
          <div className="flex justify-between gap-4 border-t border-slate-800 pt-3 text-base">
            <dt className="font-medium text-slate-300">Totalt</dt>
            <dd className="font-bold text-white">{formatMinor(o.grossAmountMinor, o.currencyCode)}</dd>
          </div>
          {o.paidAt && <Row label="Betald" value={formatOrderDate(o.paidAt)} />}
        </dl>
      </div>

      <p className="text-xs text-slate-500">
        Betalning i testläge. Domänen registreras inte i detta steg.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/portal/domains/orders" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200">
      ← Tillbaka till beställningar
    </Link>
  );
}
