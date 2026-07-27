import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { getEffectiveActor } from "@/lib/auth/customerView";

export const metadata = {
  title: "Portal",
};

/** Portal overview. Light, flat design. */
export default async function PortalPage() {
  const actor = await getEffectiveActor();

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
