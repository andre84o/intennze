import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDomainDetailView } from "@/lib/domains/portal-service";
import DomainDetailClient from "./DomainDetailClient";

export const metadata = { title: "Domän | Portal" };

/**
 * Customer domain detail. Ownership is enforced server-side; an id that is not
 * the customer's own resolves to 404 (never a leak). Hostup is the source of
 * truth with a clearly-marked cache fallback. Provider ids are never sent to the
 * client.
 */
export default async function PortalDomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getCustomerDomainDetailView(id);

  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <div className="space-y-6">
        <BackLink />
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Kunde inte ladda domänen just nu. Försök igen om en stund.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />
      <DomainDetailClient detail={res.data} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/portal/domains" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200">
      ← Tillbaka till domäner
    </Link>
  );
}
