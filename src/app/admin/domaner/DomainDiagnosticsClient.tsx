"use client";

import { useState, useTransition } from "react";
import { adminDomainDiagnostics } from "./actions";
import type { AdminAvailabilityDiagnostics } from "@/lib/domains/search-service";
import type { DomainAvailability } from "@/lib/hostup/search-types";
import { formatMinor } from "@/lib/domains/money";

// ── status → pill presentation (admin diagnostics; light theme) ───────────────
const STATE_META: Record<DomainAvailability["state"], { label: string; badge: string }> = {
  available: { label: "Ledig", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  unavailable: { label: "Upptagen", badge: "bg-slate-100 text-slate-600 ring-slate-500/20" },
  already_owned: { label: "Redan registrerad", badge: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  checking: { label: "Kontrollerar…", badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  invalid: { label: "Ogiltig", badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  unknown: { label: "Okänt", badge: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

/** Format a minor-unit amount, then drop the space before "kr" (e.g.
 *  "99,00 kr" → "99,00kr"). Other currency symbols are left untouched. */
function fmtTight(minor: number | null | undefined, currency: string | null | undefined): string {
  return formatMinor(minor, currency ?? "SEK").replace(/[\s  ]+kr$/iu, "kr");
}

// ── inline icons (no emoji; Heroicons-style, currentColor) ────────────────────
function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}
function CartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <path d="M2.5 3h1.6l1.4 8.4a1 1 0 001 .85h6.9a1 1 0 001-.8l1.1-5.45H5.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DomainDiagnosticsClient() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AdminAvailabilityDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    const q = query.trim();
    if (!q) return setError("Ange en domän eller ett sökord.");
    startTransition(async () => {
      setError(null);
      const res = await adminDomainDiagnostics({ query: q });
      if (!res.ok) {
        setData(null);
        setError(res.error);
        return;
      }
      setData(res.data);
    });
  };

  return (
    <div className="space-y-5">
      {/* Search hero */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search domain here"
              aria-label="Domän eller sökord"
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 outline-none motion-safe:transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none motion-safe:transition hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-36"
          >
            {pending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Söker…
              </>
            ) : (
              "Slå upp"
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <XIcon className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {pending && !error && (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      )}

      {/* Results */}
      {!pending && data && (
        <div className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500">
              {data.results.length} {data.results.length === 1 ? "ändelse" : "ändelser"}
            </p>
            {data.rateLimit && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
                Kvot {data.rateLimit.remaining ?? "?"}/{data.rateLimit.limit ?? "?"}
                {data.rateLimit.reset ? ` · reset ${data.rateLimit.reset}` : ""}
              </span>
            )}
          </div>

          {data.results.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Inga resultat.
            </div>
          )}

          {data.results.map((r) => {
            const dot = r.name.lastIndexOf(".");
            const label = dot > 0 ? r.name.slice(0, dot) : r.name;
            const tld = dot > 0 ? r.name.slice(dot) : "";
            const meta = STATE_META[r.state];
            const reg = r.pricing.registration;
            const canRegister = r.state === "available" && r.actions.canRegister.allowed;
            const canTransfer = !canRegister && r.actions.canTransfer.allowed;
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
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
                      {meta.label}
                    </span>
                    {r.premium && (
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                        Premium
                      </span>
                    )}
                    {r.requiresRegistrarFeeAcceptance && (
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

                    {canRegister ? (
                      <button
                        type="button"
                        className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm outline-none motion-safe:transition hover:bg-amber-500 focus-visible:ring-4 focus-visible:ring-amber-400/30"
                      >
                        <CartIcon className="h-4 w-4" />
                        Lägg till domän
                      </button>
                    ) : canTransfer ? (
                      <button
                        type="button"
                        className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm outline-none motion-safe:transition hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-gray-300/40"
                      >
                        Flytta hit
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <span
                        title={r.actions.canRegister.reason ?? r.actions.canTransfer.reason ?? undefined}
                        className="shrink-0 text-sm font-medium text-gray-400"
                      >
                        Ej tillgänglig
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}
