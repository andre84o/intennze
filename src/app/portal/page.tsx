import Link from "next/link";
import { getEffectiveActor } from "@/lib/auth/customerView";
import { getDomainsForCurrentCustomer } from "@/lib/domains/service";

export const metadata = {
  title: "Portal",
};

/**
 * Simple portal overview. Intentionally minimal — no domain management UI, DNS,
 * search, billing, etc. It only reads the customer's domain count through the
 * server-side ownership rules (Phase 2A backend), showing a neutral empty state.
 */
export default async function PortalPage() {
  const actor = await getEffectiveActor();

  const domainsResult = await getDomainsForCurrentCustomer();
  const domainCount = domainsResult.ok ? domainsResult.data.length : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Portal</h1>
        <p className="text-slate-400">
          Welcome to your portal. This is your account overview.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Overview
          </h2>
          <p className="mt-2 text-slate-300">
            Your portal is ready. More features will appear here soon.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {actor.isCustomerView ? "Viewing as customer" : "Signed in"}
          </h2>
          <p className="mt-2 text-slate-300">
            {actor.isCustomerView
              ? "An administrator is previewing this portal on the customer's behalf."
              : "You are signed in to your customer portal."}
          </p>
        </div>

        <Link
          href="/portal/domains"
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Domains
          </h2>
          <p className="mt-2 text-slate-300">
            {domainCount === 0
              ? "No domains yet"
              : `${domainCount} ${domainCount === 1 ? "domain" : "domains"}`}
          </p>
          <p className="mt-1 text-sm text-indigo-300">Visa dina domäner →</p>
        </Link>
      </section>
    </div>
  );
}
