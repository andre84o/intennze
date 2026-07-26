import { getEffectiveActor } from "@/lib/auth/customerView";

export const metadata = {
  title: "Portal",
};

/**
 * Simple portal overview. Intentionally has NO domain features yet (no domains,
 * DNS, billing, etc.) — this is only the customer-portal foundation.
 */
export default async function PortalPage() {
  const actor = await getEffectiveActor();

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
      </section>
    </div>
  );
}
