import SearchClient from "./SearchClient";

export const metadata = { title: "Domain search | Portal" };

/**
 * Customer domain search. Guarded by the /portal layout (real customer OR admin
 * in a verified customer-view). Read-only: preview/prepare only, no checkout.
 */
export default function DomainSearchPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Sök domän</h1>
        <p className="text-slate-600">
          Sök efter en domän eller ett namn och se tillgänglighet. Beställning öppnar i ett
          senare steg.
        </p>
      </header>
      <SearchClient />
    </div>
  );
}
