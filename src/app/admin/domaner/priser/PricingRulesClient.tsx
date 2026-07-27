"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreatePricingRule,
  adminSetPricingRuleActive,
  adminUpdatePricingRule,
  adminPreviewPricing,
} from "../actions";
import { formatMinor, formatBasisPoints } from "@/lib/domains/money";
import type { AdminPricingRule } from "@/lib/domains/pricing-service";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPERATIONS = ["register", "renew", "transfer"] as const;
const CALC_TYPES = ["fixed", "fixed_markup", "percentage_markup", "fixed_and_percentage"] as const;
const OP_LABEL: Record<string, string> = { register: "Registrering", renew: "Förnyelse", transfer: "Transfer" };
const CALC_LABEL: Record<string, string> = {
  fixed: "Fast kundpris",
  fixed_markup: "Fast påslag",
  percentage_markup: "Procentpåslag",
  fixed_and_percentage: "Fast + procent",
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISODate(s: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function krToMinor(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function pctToBps(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function ruleValueSummary(r: AdminPricingRule): string {
  const parts: string[] = [];
  if (r.calculation_type === "fixed" && r.fixed_customer_price_minor != null) {
    const yrs = r.fixed_price_years ?? 1;
    parts.push(`${formatMinor(Number(r.fixed_customer_price_minor), r.currency_code)}${yrs !== 1 ? ` / ${yrs} år` : ""}`);
  }
  if (r.markup_fixed_minor != null)
    parts.push(`+${formatMinor(Number(r.markup_fixed_minor), r.currency_code)}`);
  if (r.markup_percentage_basis_points != null)
    parts.push(`+${formatBasisPoints(Number(r.markup_percentage_basis_points))}`);
  if (r.minimum_customer_price_minor != null)
    parts.push(`min ${formatMinor(Number(r.minimum_customer_price_minor), r.currency_code)}`);
  return parts.join("  ") || "—";
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const labelCls = "block text-xs font-medium text-gray-500 mb-1";
const sectionLabel = "text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = parseISODate(value);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-left transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white ${
              date ? "text-gray-900" : "text-gray-400"
            }`}
          >
            <span className="truncate">{date ? date.toLocaleDateString("sv-SE") : "Välj datum"}</span>
            <svg className="size-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent className="date-popover-content z-[60] w-auto rounded-2xl border border-slate-200 p-0 shadow-xl" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(d) => {
              onChange(d ? toISODate(d) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

type FormState = {
  editingId: string | null;
  operation: string;
  calculationType: string;
  tld: string;
  currencyCode: string;
  fixedKr: string;
  fixedPriceYears: string;
  markupFixedKr: string;
  percent: string;
  minKr: string;
  appliesToPremium: boolean;
  startsAt: string;
  endsAt: string;
};

const EMPTY: FormState = {
  editingId: null,
  operation: "register",
  calculationType: "fixed",
  tld: "",
  currencyCode: "SEK",
  fixedKr: "",
  fixedPriceYears: "1",
  markupFixedKr: "",
  percent: "",
  minKr: "",
  appliesToPremium: false,
  startsAt: "",
  endsAt: "",
};

type PreviewResult = {
  priceConfigured: boolean;
  premiumRequiresManualPrice: boolean;
  providerAmountMinor: number;
  customerNet: { netAmountMinor: number; vatAmountMinor: number; grossAmountMinor: number } | null;
  marginAmountMinor: number | null;
  marginBasisPoints: number | null;
  currencyCode: string;
};

export default function PricingRulesClient({
  initialRules,
  initialError,
}: {
  initialRules: AdminPricingRule[];
  initialError: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();

  const [providerKr, setProviderKr] = useState("100");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPending, startPreview] = useTransition();

  const set = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setPreview(null);
  };

  const commonRuleFields = () => ({
    calculationType: form.calculationType as (typeof CALC_TYPES)[number],
    fixedCustomerPriceMinor: krToMinor(form.fixedKr),
    fixedPriceYears: form.fixedPriceYears.trim() === "" ? null : Number(form.fixedPriceYears),
    markupFixedMinor: krToMinor(form.markupFixedKr),
    markupPercentageBasisPoints: pctToBps(form.percent),
    minimumCustomerPriceMinor: krToMinor(form.minKr),
    startsAt: form.startsAt.trim() === "" ? null : new Date(form.startsAt).toISOString(),
    endsAt: form.endsAt.trim() === "" ? null : new Date(form.endsAt).toISOString(),
  });

  const save = () => {
    startTransition(async () => {
      setError(null);
      const res = form.editingId
        ? await adminUpdatePricingRule(form.editingId, commonRuleFields())
        : await adminCreatePricingRule({
            operation: form.operation as (typeof OPERATIONS)[number],
            tld: form.tld.trim() || null,
            currencyCode: form.currencyCode.trim().toUpperCase() || "SEK",
            appliesToPremium: form.appliesToPremium,
            ...commonRuleFields(),
          });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setForm(EMPTY);
      setPreview(null);
      router.refresh();
    });
  };

  const toggleActive = (id: string, active: boolean) => {
    startTransition(async () => {
      setError(null);
      const res = await adminSetPricingRuleActive(id, active);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const editRule = (r: AdminPricingRule) => {
    setPreview(null);
    setForm({
      editingId: r.id,
      operation: r.operation,
      calculationType: r.calculation_type,
      tld: r.tld ?? "",
      currencyCode: r.currency_code,
      fixedKr: r.fixed_customer_price_minor != null ? String(Number(r.fixed_customer_price_minor) / 100) : "",
      fixedPriceYears: r.fixed_price_years != null ? String(r.fixed_price_years) : "1",
      markupFixedKr: r.markup_fixed_minor != null ? String(Number(r.markup_fixed_minor) / 100) : "",
      percent: r.markup_percentage_basis_points != null ? String(Number(r.markup_percentage_basis_points) / 100) : "",
      minKr: r.minimum_customer_price_minor != null ? String(Number(r.minimum_customer_price_minor) / 100) : "",
      appliesToPremium: r.applies_to_premium,
      startsAt: r.starts_at ? r.starts_at.slice(0, 10) : "",
      endsAt: r.ends_at ? r.ends_at.slice(0, 10) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runPreview = () => {
    startPreview(async () => {
      setPreviewError(null);
      const providerAmountMinor = krToMinor(providerKr);
      if (providerAmountMinor == null || providerAmountMinor < 0) {
        setPreviewError("Ange ett giltigt providerpris i kronor.");
        return;
      }
      const res = await adminPreviewPricing({
        operation: form.operation as (typeof OPERATIONS)[number],
        calculationType: form.calculationType as (typeof CALC_TYPES)[number],
        tld: form.tld.trim() || null,
        years: form.fixedPriceYears.trim() === "" ? 1 : Number(form.fixedPriceYears),
        providerAmountMinor,
        currencyCode: form.currencyCode.trim().toUpperCase() || "SEK",
        premium: form.appliesToPremium,
        appliesToPremium: form.appliesToPremium,
        fixedCustomerPriceMinor: krToMinor(form.fixedKr),
        fixedPriceYears: form.fixedPriceYears.trim() === "" ? null : Number(form.fixedPriceYears),
        markupFixedMinor: krToMinor(form.markupFixedKr),
        markupPercentageBasisPoints: pctToBps(form.percent),
        minimumCustomerPriceMinor: krToMinor(form.minKr),
      });
      if (!res.ok) {
        setPreview(null);
        setPreviewError(res.error);
        return;
      }
      setPreview(res.data);
    });
  };

  const showFixed = form.calculationType === "fixed";
  const showFixedMarkup = form.calculationType === "fixed_markup" || form.calculationType === "fixed_and_percentage";
  const showPercent = form.calculationType === "percentage_markup" || form.calculationType === "fixed_and_percentage";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Form card ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {form.editingId ? "Redigera prisregel" : "Ny prisregel"}
          </h2>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Section 1 — Regelidentitet */}
          <div>
            <p className={sectionLabel}>Regelidentitet</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className={labelCls}>Operation</label>
                <Select
                  value={form.operation}
                  disabled={!!form.editingId}
                  onValueChange={(v) => set({ operation: v })}
                >
                  <SelectTrigger className={inputCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {OPERATIONS.map((o) => (
                      <SelectItem key={o} value={o} className="rounded-lg">{OP_LABEL[o]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelCls}>TLD <span className="font-normal">(tomt = standard)</span></label>
                <input
                  className={inputCls}
                  placeholder="se"
                  value={form.tld}
                  disabled={!!form.editingId}
                  onChange={(e) => set({ tld: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Valuta</label>
                <input
                  className={inputCls}
                  value={form.currencyCode}
                  disabled={!!form.editingId}
                  onChange={(e) => set({ currencyCode: e.target.value })}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={form.appliesToPremium}
                    disabled={!!form.editingId}
                    onChange={(e) => set({ appliesToPremium: e.target.checked })}
                  />
                  Premiumdomäner
                </label>
              </div>
            </div>
          </div>

          {/* Section 2 — Prisberäkning */}
          <div className="border-t border-gray-100 pt-5">
            <p className={sectionLabel}>Prisberäkning</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Beräkningsmetod</label>
                <Select
                  value={form.calculationType}
                  onValueChange={(v) => set({ calculationType: v })}
                >
                  <SelectTrigger className={inputCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CALC_TYPES.map((c) => (
                      <SelectItem key={c} value={c} className="rounded-lg">{CALC_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showFixed && (
                <>
                  <div>
                    <label className={labelCls}>Fast kundpris (kr, exkl. moms)</label>
                    <input
                      className={inputCls}
                      inputMode="decimal"
                      placeholder="149.00"
                      value={form.fixedKr}
                      onChange={(e) => set({ fixedKr: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Gäller antal år</label>
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={form.fixedPriceYears}
                      onChange={(e) => set({ fixedPriceYears: e.target.value })}
                    />
                  </div>
                </>
              )}
              {showFixedMarkup && (
                <div>
                  <label className={labelCls}>Fast påslag (kr)</label>
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    placeholder="50.00"
                    value={form.markupFixedKr}
                    onChange={(e) => set({ markupFixedKr: e.target.value })}
                  />
                </div>
              )}
              {showPercent && (
                <div>
                  <label className={labelCls}>Procentpåslag (%)</label>
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    placeholder="20"
                    value={form.percent}
                    onChange={(e) => set({ percent: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>Minimipris (kr, valfritt)</label>
                <input
                  className={inputCls}
                  inputMode="decimal"
                  placeholder="—"
                  value={form.minKr}
                  onChange={(e) => set({ minKr: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 3 — Period */}
          <div className="border-t border-gray-100 pt-5">
            <p className={sectionLabel}>
              Period <span className="normal-case font-normal tracking-normal">(valfritt)</span>
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateField label="Startdatum" value={form.startsAt} onChange={(v) => set({ startsAt: v })} />
              <DateField label="Slutdatum" value={form.endsAt} onChange={(v) => set({ endsAt: v })} />
            </div>
          </div>

          {/* Section 4 — Preview */}
          <div className="border-t border-gray-100 pt-5">
            <p className={sectionLabel}>Pris-preview</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={labelCls}>Hypotetiskt providerpris (kr)</label>
                <input
                  className={`${inputCls} w-40`}
                  inputMode="decimal"
                  value={providerKr}
                  onChange={(e) => setProviderKr(e.target.value)}
                />
              </div>
              <button
                className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                disabled={previewPending}
                onClick={runPreview}
              >
                {previewPending ? "Beräknar…" : "Beräkna"}
              </button>
            </div>
            {previewError && <p className="mt-3 text-sm text-red-700">{previewError}</p>}
            {preview && (
              <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                {preview.premiumRequiresManualPrice ? (
                  <p className="text-sm text-amber-700">Premiumdomän — kräver manuellt pris.</p>
                ) : !preview.priceConfigured || !preview.customerNet ? (
                  <p className="text-sm text-gray-500">Pris ej konfigurerat för denna regel/period.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-4">
                    <dt className="text-gray-500">Providerpris</dt>
                    <dd className="font-medium text-gray-900">{formatMinor(preview.providerAmountMinor, preview.currencyCode)}</dd>
                    <dt className="text-gray-500">Kundpris exkl. moms</dt>
                    <dd className="font-medium text-gray-900">{formatMinor(preview.customerNet.netAmountMinor, preview.currencyCode)}</dd>
                    <dt className="text-gray-500">Moms</dt>
                    <dd className="text-gray-700">{formatMinor(preview.customerNet.vatAmountMinor, preview.currencyCode)}</dd>
                    <dt className="text-gray-500">Kundpris inkl. moms</dt>
                    <dd className="font-semibold text-gray-900">{formatMinor(preview.customerNet.grossAmountMinor, preview.currencyCode)}</dd>
                    <dt className="text-gray-500">Marginal</dt>
                    <dd className="text-gray-700">{formatMinor(preview.marginAmountMinor, preview.currencyCode)} ({formatBasisPoints(preview.marginBasisPoints)})</dd>
                  </dl>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button className={btnPrimary} disabled={pending} onClick={save}>
            {pending ? "Sparar…" : form.editingId ? "Spara ändringar" : "Skapa regel"}
          </button>
          {form.editingId && (
            <button
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { setForm(EMPTY); setPreview(null); }}
            >
              Avbryt
            </button>
          )}
        </div>
      </div>

      {/* ── Rules table ────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {initialRules.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-400">Inga prisregler ännu.</p>
            <p className="text-xs text-gray-400 mt-1">Om ingen regel finns ser kunden att priset inte är konfigurerat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">TLD</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Operation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Metod</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Värde</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Premium</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialRules.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {r.tld ? `.${r.tld}` : <span className="font-sans font-normal text-gray-400">(standard)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{OP_LABEL[r.operation] ?? r.operation}</td>
                    <td className="px-4 py-3 text-gray-600">{CALC_LABEL[r.calculation_type] ?? r.calculation_type}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{ruleValueSummary(r)}</td>
                    <td className="px-4 py-3 text-gray-500 text-center">{r.applies_to_premium ? "Ja" : "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.is_active
                            ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          onClick={() => editRule(r)}
                        >
                          Redigera
                        </button>
                        <button
                          className="text-xs text-gray-500 hover:text-gray-800 font-medium disabled:opacity-40"
                          disabled={pending}
                          onClick={() => toggleActive(r.id, !r.is_active)}
                        >
                          {r.is_active ? "Inaktivera" : "Aktivera"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
