import Link from "next/link";
import { getCustomerDomainListView } from "@/lib/domains/portal-service";
import { formatMinor } from "@/lib/domains/money";
import type { CustomerPriceView } from "@/lib/domains/pricing-service";
import { DomainIcon, statusBadgeClass, attentionBadgeClass, formatDate } from "./ui";

export const metadata = { title: "Domäner | Portal" };

function renewalText(view: CustomerPriceView, currency: string): string {
  if (view.premiumRequiresManualPrice) return "Bekräftas manuellt";
  if (view.priceConfigured && view.net) return `${formatMinor(view.net.netAmountMinor, currency)} exkl. moms`;
  return "Pris ej konfigurerat";
}

/**
 * Customer domain list + overview. Ownership-scoped server-side. Provider ids /
 * prices are never present in the DTO. Responsive: cards on mobile, a table on
 * desktop — the page body never scrolls horizontally.
 */
export default async function PortalDomainsPage() {
  const res = await getCustomerDomainListView();

  if (!res.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Domäner</h1>
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Kunde inte ladda dina domäner just nu. Försök igen om en stund.
        </div>
      </div>
    );
  }

  const { overview, items } = res.data;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Domäner</h1>
        <p className="text-slate-400">Dina domäner, status, förnyelse och nameservrar.</p>
      </header>

      {/* Overview cards */}
      <section aria-label="Översikt" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Domäner", value: overview.total },
          { label: "Kräver åtgärd", value: overview.needsAttention },
          { label: "Går ut snart", value: overview.expiringSoon },
          { label: "Autoförnyelse av", value: overview.autoRenewOff },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-sm font-medium text-slate-400">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{c.value}</p>
          </div>
        ))}
      </section>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-300">Du har inga domäner ännu.</p>
          <Link
            href="/portal/domains/search"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Sök en domän
          </Link>
        </div>
      ) : (
        <section aria-label="Dina domäner">
          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/portal/domains/${d.id}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{d.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(
                        d.status.tone
                      )}`}
                    >
                      <DomainIcon name={d.status.icon} className="h-3.5 w-3.5" />
                      {d.status.label}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Går ut</dt>
                      <dd className="text-slate-300">{formatDate(d.expiresAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Förnyelse</dt>
                      <dd className="text-slate-300">{renewalText(d.pricing.renewal, d.currencyCode)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Autoförnyelse</dt>
                      <dd className="text-slate-300">{d.autoRenew ? "På" : "Av"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Nameservrar</dt>
                      <dd className="text-slate-300">{d.nameserverCount}</dd>
                    </div>
                  </dl>
                  {d.needsAttention && (
                    <p
                      className={`mt-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${attentionBadgeClass(
                        d.attentionPrimary.level
                      )}`}
                    >
                      <DomainIcon name={d.attentionPrimary.icon} className="h-3.5 w-3.5" />
                      {d.attentionPrimary.label}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Domän</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Går ut</th>
                  <th scope="col" className="px-4 py-3 font-medium">Förnyelse</th>
                  <th scope="col" className="px-4 py-3 font-medium">Auto</th>
                  <th scope="col" className="px-4 py-3 font-medium">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <Link href={`/portal/domains/${d.id}`} className="font-medium text-indigo-300 hover:underline">
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(
                          d.status.tone
                        )}`}
                      >
                        <DomainIcon name={d.status.icon} className="h-3.5 w-3.5" />
                        {d.status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(d.expiresAt)}</td>
                    <td className="px-4 py-3 text-slate-300">{renewalText(d.pricing.renewal, d.currencyCode)}</td>
                    <td className="px-4 py-3 text-slate-300">{d.autoRenew ? "På" : "Av"}</td>
                    <td className="px-4 py-3">
                      {d.needsAttention ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${attentionBadgeClass(
                            d.attentionPrimary.level
                          )}`}
                        >
                          <DomainIcon name={d.attentionPrimary.icon} className="h-3.5 w-3.5" />
                          {d.attentionPrimary.label}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
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
