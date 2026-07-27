import SearchClient from "./SearchClient";

export const metadata = { title: "Domain search | Portal" };

// Common extensions offered as quick toggles. The full TLD catalogue is large;
// these are the defaults shown as chips (users can also type a full domain).
const COMMON_TLDS = ["se", "nu", "com", "net", "org", "eu", "io"];

/**
 * Customer domain search. Guarded by the /portal layout (real customer OR admin
 * in a verified customer-view). Read-only: preview/prepare only, no checkout.
 */
export default function DomainSearchPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Sök domän</h1>
        <p className="text-slate-400">
          Sök efter en domän eller ett namn och se tillgänglighet. Beställning öppnar i ett
          senare steg.
        </p>
      </header>
      <SearchClient commonTlds={COMMON_TLDS} />
    </div>
  );
}
