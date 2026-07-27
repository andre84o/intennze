"use client";

import { useState, useTransition } from "react";
import { searchDomains } from "../actions";
import { formatMinor } from "@/lib/domains/money";
import type { CustomerDomainResult } from "@/lib/domains/search-service";

const STATE_LABEL: Record<CustomerDomainResult["state"], string> = {
  available: "Ledig",
  unavailable: "Upptagen",
  already_owned: "Redan registrerad",
  checking: "Kontrollerar…",
  invalid: "Ogiltig",
  unknown: "Okänt",
};

const STATE_BADGE: Record<CustomerDomainResult["state"], string> = {
  available: "bg-green-500/15 text-green-300 border-green-500/30",
  unavailable: "bg-slate-700 text-slate-300 border-slate-600",
  already_owned: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  checking: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  invalid: "bg-red-500/15 text-red-300 border-red-500/30",
  unknown: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export default function SearchClient({ commonTlds }: { commonTlds: string[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["se", "com"]));
  const [results, setResults] = useState<CustomerDomainResult[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleTld = (tld: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tld)) next.delete(tld);
      else next.add(tld);
      return next;
    });

  const runSearch = () => {
    const q = query.trim();
    if (!q) {
      setError("Skriv in en domän eller ett namn.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await searchDomains({ query: q, tlds: [...selected] });
      if (!res.ok) {
        setResults(null);
        setError(res.error);
        return;
      }
      setResults(res.data.results);
      setTruncated(res.data.truncated);
    });
  };

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20";
  const btnPrimary =
    "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const btnDisabled =
    "rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed opacity-60";

  return (
    <div className="space-y-6">
      {/* Search form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="t.ex. intenzze eller intenzze.se"
              className={inputCls}
              aria-label="Domän eller sökord"
            />
            <button type="submit" disabled={pending} className={`${btnPrimary} sm:w-32 shrink-0`}>
              {pending ? "Söker…" : "Sök"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {commonTlds.map((tld) => {
              const on = selected.has(tld);
              return (
                <button
                  type="button"
                  key={tld}
                  onClick={() => toggleTld(tld)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    on
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                      : "border-slate-700 text-slate-400 hover:bg-slate-800/60"
                  }`}
                  aria-pressed={on}
                >
                  .{tld}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Tips: skriv ett fullständigt domännamn (intenzze.se) eller ett sökord och välj
            ändelser ovan.
          </p>
        </form>
      </div>

      {/* Error + retry */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{error}</span>
          <button type="button" onClick={runSearch} disabled={pending} className={btnPrimary}>
            Försök igen
          </button>
        </div>
      )}

      {/* Loading */}
      {pending && !error && <p className="text-sm text-slate-400">Söker domäner…</p>}

      {/* Empty state */}
      {!pending && results && results.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">Inga resultat.</p>
      )}

      {/* Results */}
      {!pending && results && results.length > 0 && (
        <div className="space-y-3">
          {truncated && (
            <p className="text-xs text-amber-300/80">Visar de första ändelserna av din sökning.</p>
          )}
          {results.map((r) => (
            <div key={r.name} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{r.name}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATE_BADGE[r.state]}`}>
                    {STATE_LABEL[r.state]}
                  </span>
                  {r.premium && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                      Premium
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled title="Detaljer öppnar snart" className={btnDisabled}>
                    Se detaljer
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Beställning öppnar i ett senare steg"
                    className={btnDisabled}
                  >
                    Förbered beställning
                  </button>
                </div>
              </div>

              {/* Price (customer sale price only — never the provider price).
                  Rules are stored ex-VAT; we show ex moms and never reuse the
                  registration price as the renewal price. */}
              <div className="mt-3 space-y-0.5 text-sm">
                {/* Registration */}
                <div>
                  {r.pricing.registration.premiumRequiresManualPrice ? (
                    <span className="text-amber-300">
                      Premiumdomän – pris bekräftas manuellt
                    </span>
                  ) : r.pricing.registration.priceConfigured && r.pricing.registration.net ? (
                    <span className="text-slate-200">
                      Registrering: {formatMinor(r.pricing.registration.net.netAmountMinor, r.pricing.currencyCode)}{" "}
                      <span className="text-slate-500">exkl. moms</span>
                      <span className="text-slate-400">
                        {" "}
                        (
                        {formatMinor(r.pricing.registration.net.grossAmountMinor, r.pricing.currencyCode)} inkl. moms)
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Registreringspris ej konfigurerat</span>
                  )}
                </div>
                {/* Renewal — shown separately; absence is never hidden by reusing registration */}
                <div className="text-slate-400">
                  {r.pricing.renewal.premiumRequiresManualPrice ? (
                    <span>Förnyelse: bekräftas manuellt (premium)</span>
                  ) : r.pricing.renewal.priceConfigured && r.pricing.renewal.net ? (
                    <span>
                      Förnyelse: {formatMinor(r.pricing.renewal.net.netAmountMinor, r.pricing.currencyCode)} exkl. moms
                    </span>
                  ) : (
                    <span>Förnyelse: Pris ej konfigurerat</span>
                  )}
                </div>
                {r.pricing.requiresRegistrarFeeAcceptance && (
                  <div className="text-xs text-amber-300/80">
                    Kräver godkännande av registraravgift vid beställning.
                  </div>
                )}
              </div>

              {/* unknown → retry hint */}
              {r.state === "unknown" && (
                <button type="button" onClick={runSearch} className="mt-2 text-xs text-indigo-300 hover:underline">
                  Kunde inte avgöras{r.unknownReason ? ` (${r.unknownReason})` : ""} — försök igen
                </button>
              )}

              {/* Periods */}
              {r.canRegister && r.supportedRegisterYears.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Registreringsperiod: {r.supportedRegisterYears.join(", ")} år
                </p>
              )}

              {/* Requirements to display (dynamic; nothing collected in this phase) */}
              {r.requirements.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  Kräver vid beställning:{" "}
                  {r.requirements
                    .filter((req) => req.required)
                    .map((req) => req.label)
                    .join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
