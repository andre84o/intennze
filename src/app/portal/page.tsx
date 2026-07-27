import Link from "next/link";
import { ArrowRight, Globe, Search, ReceiptText, ShieldCheck } from "lucide-react";
import { getEffectiveActor } from "@/lib/auth/customerView";
import { getDomainsForCurrentCustomer } from "@/lib/domains/service";

export const metadata = {
  title: "Portal",
};

/**
 * Portal overview. Reads the customer's domain count through the server-side
 * ownership rules and presents quick-access cards. Light, flat design.
 */
export default async function PortalPage() {
  const actor = await getEffectiveActor();

  const domainsResult = await getDomainsForCurrentCustomer();
  const domainCount = domainsResult.ok ? domainsResult.data.length : 0;

  const actions = [
    {
      href: "/portal/domains",
      icon: Globe,
      title: "Domäner",
      body:
        domainCount === 0
          ? "Du har inga domäner ännu."
          : `${domainCount} ${domainCount === 1 ? "domän" : "domäner"} i ditt konto.`,
      cta: "Visa dina domäner",
    },
    {
      href: "/portal/domains/search",
      icon: Search,
      title: "Sök domän",
      body: "Hitta och säkra ett nytt domännamn för ditt varumärke.",
      cta: "Sök domän",
    },
    {
      href: "/portal/domains/orders",
      icon: ReceiptText,
      title: "Beställningar",
      body: "Följ dina beställningar och deras status.",
      cta: "Visa beställningar",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Kundportal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Välkommen tillbaka
        </h1>
        <p className="mt-2 max-w-xl text-slate-600">
          Här hanterar du dina domäner, söker nya namn och följer dina beställningar — allt på ett
          ställe.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/portal/domains/search"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Sök en domän
          </Link>
          <Link
            href="/portal/domains"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Mina domäner
          </Link>
        </div>
      </header>

      {/* Quick actions */}
      <section aria-label="Snabbåtgärder" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(({ href, icon: Icon, title, body, cta }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all motion-safe:hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 flex-1 text-sm text-slate-600">{body}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
              {cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>

      {/* Account status */}
      <section
        aria-label="Kontostatus"
        className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {actor.isCustomerView ? "Visas som kund" : "Inloggad"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {actor.isCustomerView
              ? "En administratör förhandsvisar den här portalen å kundens vägnar."
              : "Du är inloggad i din kundportal. Din anslutning är säker."}
          </p>
        </div>
      </section>
    </div>
  );
}
