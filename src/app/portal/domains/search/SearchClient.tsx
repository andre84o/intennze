"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { searchDomains, prepareQuote } from "../actions";
import { formatMinor } from "@/lib/domains/money";
import type { CustomerDomainResult } from "@/lib/domains/search-service";
import type { DomainQuoteSnapshot } from "@/lib/domains/quote";

const STATE_LABEL: Record<CustomerDomainResult["state"], string> = {
  available: "Ledig",
  unavailable: "Upptagen",
  already_owned: "Redan registrerad",
  checking: "Kontrollerar…",
  invalid: "Ogiltig",
  unknown: "Okänt",
};

const STATE_BADGE: Record<CustomerDomainResult["state"], string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unavailable: "bg-slate-100 text-slate-600 border-slate-200",
  already_owned: "bg-amber-50 text-amber-700 border-amber-200",
  checking: "bg-blue-50 text-blue-700 border-blue-200",
  invalid: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatQuoteTime(ms: number): string {
  return new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerDomainResult[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Per-domain selected registration period (years) and prepared quote / error.
  const [years, setYears] = useState<Record<string, number>>({});
  const [quotes, setQuotes] = useState<Record<string, DomainQuoteSnapshot>>({});
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});
  const [preparing, setPreparing] = useState<string | null>(null);
  const [, startQuote] = useTransition();

  const runSearch = () => {
    const q = query.trim();
    if (!q) {
      setError("Skriv in en domän eller ett namn.");
      return;
    }
    startTransition(async () => {
      setError(null);
      setQuotes({});
      setQuoteErrors({});
      const res = await searchDomains({ query: q });
      if (!res.ok) {
        setResults(null);
        setError(res.error);
        return;
      }
      setResults(res.data.results);
      setTruncated(res.data.truncated);
    });
  };

  const prepare = (r: CustomerDomainResult) => {
    const chosen = years[r.name] ?? r.supportedRegisterYears[0] ?? 1;
    setPreparing(r.name);
    startQuote(async () => {
      setQuoteErrors((p) => ({ ...p, [r.name]: "" }));
      const res = await prepareQuote({ domainName: r.name, operation: "register", years: chosen });
      setPreparing(null);
      if (!res.ok) {
        setQuoteErrors((p) => ({ ...p, [r.name]: res.error }));
        return;
      }
      setQuotes((p) => ({ ...p, [r.name]: res.data }));
    });
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";
  const btnPrimary =
    "rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed";
  const btnDisabled =
    "rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed";
  const btnSecondary =
    "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6">
      {/* Search form */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
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
              placeholder="Search domain here"
              className={inputCls}
              aria-label="Domän eller sökord"
            />
            <button type="submit" disabled={pending} className={`${btnPrimary} sm:w-32 shrink-0`}>
              {pending ? "Söker…" : "Sök"}
            </button>
          </div>

        </form>
      </div>

      {/* Error + retry */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button type="button" onClick={runSearch} disabled={pending} className={btnPrimary}>
            Försök igen
          </button>
        </div>
      )}

      {/* Loading */}
      {pending && !error && <p className="text-sm text-slate-500">Söker domäner…</p>}

      {/* Results */}
      <div aria-live="polite" aria-busy={pending}>
        {/* Empty state */}
        {!pending && results && results.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">Inga resultat.</p>
        )}

        {!pending && results && results.length > 0 && (
          <div className="space-y-3">
            {truncated && (
              <p className="text-xs text-amber-700">Visar de första ändelserna av din sökning.</p>
            )}
            {results.map((r) => {
              const quote = quotes[r.name];
              const qErr = quoteErrors[r.name];
              const chosenYears = years[r.name] ?? r.supportedRegisterYears[0] ?? 1;
              return (
                <div key={r.name} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-900">{r.name}</span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATE_BADGE[r.state]}`}>
                        {STATE_LABEL[r.state]}
                      </span>
                      {r.premium && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Premium
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled title="Detaljer öppnar när domänen är din" className={btnDisabled}>
                        Se detaljer
                      </button>
                      <button
                        type="button"
                        onClick={() => prepare(r)}
                        disabled={!r.canRegister || preparing === r.name}
                        title={
                          r.canRegister
                            ? "Förbered en beställning (ingen beställning skapas)"
                            : "Domänen kan inte registreras"
                        }
                        className={r.canRegister ? btnSecondary : btnDisabled}
                      >
                        {preparing === r.name ? "Förbereder…" : "Förbered beställning"}
                      </button>
                    </div>
                  </div>

                  {/* Price (customer sale price only — never the provider price). */}
                  <div className="mt-3 space-y-0.5 text-sm">
                    <div>
                      {r.pricing.registration.premiumRequiresManualPrice ? (
                        <span className="text-amber-700">Premiumdomän – pris bekräftas manuellt</span>
                      ) : r.pricing.registration.priceConfigured && r.pricing.registration.net ? (
                        <span className="text-slate-700">
                          Registrering: {formatMinor(r.pricing.registration.net.netAmountMinor, r.pricing.currencyCode)}{" "}
                          <span className="text-slate-500">exkl. moms</span>
                          <span className="text-slate-400">
                            {" "}
                            ({formatMinor(r.pricing.registration.net.grossAmountMinor, r.pricing.currencyCode)} inkl. moms)
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Registreringspris ej konfigurerat</span>
                      )}
                    </div>
                    <div className="text-slate-500">
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
                      <div className="text-xs text-amber-700">
                        Kräver godkännande av registraravgift vid beställning.
                      </div>
                    )}
                  </div>

                  {/* unknown → retry hint */}
                  {r.state === "unknown" && (
                    <button type="button" onClick={runSearch} className="mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline">
                      Kunde inte avgöras{r.unknownReason ? ` (${r.unknownReason})` : ""} — försök igen
                    </button>
                  )}

                  {/* Period selector (registration years) */}
                  {r.canRegister && r.supportedRegisterYears.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <label htmlFor={`years-${r.name}`} className="text-xs text-slate-500">
                        Registreringsperiod
                      </label>
                      <select
                        id={`years-${r.name}`}
                        value={chosenYears}
                        onChange={(e) => setYears((p) => ({ ...p, [r.name]: Number(e.target.value) }))}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                      >
                        {r.supportedRegisterYears.map((y) => (
                          <option key={y} value={y}>
                            {y} år
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Prepared-quote confirmation */}
                  {qErr && (
                    <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {qErr}
                    </p>
                  )}
                  {quote && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <p className="font-medium">Beställning förberedd (ingen beställning har skapats).</p>
                      <p className="mt-1 text-emerald-700">
                        {quote.domainName} · {quote.years} år ·{" "}
                        {quote.priceConfigured && quote.netAmountMinor != null
                          ? `${formatMinor(quote.netAmountMinor, quote.currencyCode)} exkl. moms`
                          : "pris bekräftas manuellt"}
                      </p>
                      <p className="mt-0.5 text-emerald-600">
                        Sparad till {formatQuoteTime(quote.expiresAtMs)}.
                      </p>
                      {quote.priceConfigured && (
                        <Link
                          href="/portal/domains/checkout"
                          className="mt-2 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
                        >
                          Gå till kassan
                        </Link>
                      )}
                    </div>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
