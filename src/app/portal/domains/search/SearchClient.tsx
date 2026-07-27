"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
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
  available: "bg-emerald-500 text-white ring-emerald-700/30",
  unavailable: "bg-slate-400 text-white ring-slate-600/30",
  already_owned: "bg-amber-600 text-white ring-amber-700/30",
  checking: "bg-blue-600 text-white ring-blue-700/30",
  invalid: "bg-rose-600 text-white ring-rose-700/30",
  unknown: "bg-slate-500 text-white ring-slate-600/30",
};

function formatQuoteTime(ms: number): string {
  return new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

/** Format a minor amount and drop the space before "kr" (matches the admin cards). */
function fmtTight(minor: number | null | undefined, currency: string): string {
  return formatMinor(minor, currency).replace(/[\s  ]+kr$/iu, "kr");
}

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerDomainResult[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Per-domain prepared quote / error. Domains register for the standard period
  // and renew automatically — no period picker.
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
    const chosen = r.supportedRegisterYears[0] ?? 1;
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
              const dotIdx = r.name.lastIndexOf(".");
              const label = dotIdx > 0 ? r.name.slice(0, dotIdx) : r.name;
              const tld = dotIdx > 0 ? r.name.slice(dotIdx) : "";
              const reg = r.pricing.registration;
              const priceText =
                reg.priceConfigured && reg.net ? fmtTight(reg.net.netAmountMinor, r.pricing.currencyCode) : null;
              return (
                <div
                  key={r.name}
                  className="group rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm motion-safe:transition hover:border-gray-300 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left — domain name + status/badges */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-lg text-gray-800">
                        {label}
                        <span className="font-bold text-gray-950">{tld}</span>
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-4 ring-1 ring-inset sm:text-[11px] ${STATE_BADGE[r.state]}`}>
                        {STATE_LABEL[r.state]}
                      </span>
                      {r.premium && (
                        <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                          Premium
                        </span>
                      )}
                      {r.pricing.requiresRegistrarFeeAcceptance && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          Registraravgift
                        </span>
                      )}
                    </div>

                    {/* Right — price + primary action */}
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        {reg.premiumRequiresManualPrice ? (
                          <span className="text-sm font-semibold text-amber-600">Manuellt pris</span>
                        ) : priceText ? (
                          <span className="text-lg font-bold text-gray-900">{priceText}</span>
                        ) : (
                          <span className="text-sm font-medium text-gray-400">Pris ej satt</span>
                        )}
                      </div>
                      {r.canRegister ? (
                        <button
                          type="button"
                          onClick={() => prepare(r)}
                          disabled={preparing === r.name}
                          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-amber-400/70 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm outline-none motion-safe:transition hover:bg-amber-500 focus-visible:ring-4 focus-visible:ring-amber-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                          {preparing === r.name ? "Förbereder…" : "Lägg till domän"}
                        </button>
                      ) : (
                        <span
                          title={r.registerReason ?? undefined}
                          className="shrink-0 text-sm font-medium text-gray-400"
                        >
                          Ej tillgänglig
                        </span>
                      )}
                    </div>
                  </div>

                  {/* unknown → retry hint */}
                  {r.state === "unknown" && (
                    <button type="button" onClick={runSearch} className="mt-3 text-xs text-blue-600 hover:text-blue-700 hover:underline">
                      Kunde inte avgöras{r.unknownReason ? ` (${r.unknownReason})` : ""} — försök igen
                    </button>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
