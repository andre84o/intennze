"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreatePricingRulesForTlds,
  adminSetPricingRuleActive,
  adminUpdatePricingRule,
  adminPreviewPricing,
  adminPreviewPricingWithHostup,
} from "../actions";
import { formatMinor, formatBasisPoints } from "@/lib/domains/money";
import {
  hasConflictingAllRule,
  conflictingSpecificTlds,
  normalizeTld,
  parseTldSelection,
  type ExistingRuleLite,
  type RuleKey,
} from "@/lib/domains/pricing-rules-selection";
import type { AdminPricingRule, AdminHostupPricePreview, AdminPricePreview } from "@/lib/domains/pricing-service";
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
const PINNED_TLDS = ["se", "nu", "com"];

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
function toIso(d: string): string | null {
  return d.trim() === "" ? null : new Date(d).toISOString();
}

function ruleValueSummary(r: AdminPricingRule): string {
  const parts: string[] = [];
  if (r.calculation_type === "fixed" && r.fixed_customer_price_minor != null) {
    const yrs = r.fixed_price_years ?? 1;
    parts.push(`${formatMinor(Number(r.fixed_customer_price_minor), r.currency_code)}${yrs !== 1 ? ` / ${yrs} år` : ""}`);
  }
  if (r.markup_fixed_minor != null) parts.push(`+${formatMinor(Number(r.markup_fixed_minor), r.currency_code)}`);
  if (r.markup_percentage_basis_points != null) parts.push(`+${formatBasisPoints(Number(r.markup_percentage_basis_points))}`);
  if (r.minimum_customer_price_minor != null) parts.push(`min ${formatMinor(Number(r.minimum_customer_price_minor), r.currency_code)}`);
  return parts.join("  ") || "—";
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const labelCls = "block text-xs font-medium text-gray-500 mb-1";
const sectionLabel = "text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50";

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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
  editingTld: string | null; // locked TLD when editing an existing rule
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
  editingTld: null,
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

export default function PricingRulesClient({
  initialRules,
  initialError,
  tldOptions,
}: {
  initialRules: AdminPricingRule[];
  initialError: string | null;
  tldOptions: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // TLD multi-select (create mode only).
  const [selectAll, setSelectAll] = useState(false);
  const [selectedTlds, setSelectedTlds] = useState<string[]>([]);
  const [tldPickerOpen, setTldPickerOpen] = useState(false);
  const [tldFilter, setTldFilter] = useState("");
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const tldPickerRef = useRef<HTMLDivElement>(null);

  // Close picker on click outside.
  useEffect(() => {
    if (!tldPickerOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (tldPickerRef.current && !tldPickerRef.current.contains(e.target as Node)) {
        setTldPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [tldPickerOpen]);

  // Live Hostup pricing (default) + manual (advanced).
  const [previewTld, setPreviewTld] = useState("");
  const [hostupPreview, setHostupPreview] = useState<AdminHostupPricePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPending, startPreview] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [providerKr, setProviderKr] = useState("100");
  const [manualPreview, setManualPreview] = useState<AdminPricePreview | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualPending, startManual] = useTransition();

  const set = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setHostupPreview(null);
    setManualPreview(null);
  };

  const ruleKey: RuleKey = {
    operation: form.operation,
    currencyCode: form.currencyCode.trim().toUpperCase() || "SEK",
    premium: form.appliesToPremium,
    startsAt: toIso(form.startsAt),
    endsAt: toIso(form.endsAt),
  };
  const existingLite = initialRules as ExistingRuleLite[];
  const allConflict = hasConflictingAllRule(existingLite, ruleKey);
  const specificConflicts = useMemo(
    () => conflictingSpecificTlds(existingLite, selectedTlds, ruleKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialRules, selectedTlds, form.operation, form.currencyCode, form.appliesToPremium, form.startsAt, form.endsAt]
  );

  const tldMenu = useMemo(() => {
    const rest = tldOptions.filter((t) => !PINNED_TLDS.includes(t));
    const merged = [...PINNED_TLDS, ...rest];
    const f = tldFilter.trim().toLowerCase();
    return f ? merged.filter((t) => t.includes(f)) : merged;
  }, [tldOptions, tldFilter]);

  const commonRuleFields = () => ({
    calculationType: form.calculationType as (typeof CALC_TYPES)[number],
    fixedCustomerPriceMinor: krToMinor(form.fixedKr),
    fixedPriceYears: form.fixedPriceYears.trim() === "" ? null : Number(form.fixedPriceYears),
    markupFixedMinor: krToMinor(form.markupFixedKr),
    markupPercentageBasisPoints: pctToBps(form.percent),
    minimumCustomerPriceMinor: krToMinor(form.minKr),
    startsAt: toIso(form.startsAt),
    endsAt: toIso(form.endsAt),
  });

  const resetForm = () => {
    setForm(EMPTY);
    setSelectAll(false);
    setSelectedTlds([]);
    setSelectionError(null);
    setTldPickerOpen(false);
    setHostupPreview(null);
    setManualPreview(null);
  };

  const toggleAll = () => {
    if (allConflict) return;
    setSelectionError(null);
    setSelectAll((prev) => {
      const next = !prev;
      if (next) setSelectedTlds([]);
      return next;
    });
  };
  const toggleTld = (tld: string) => {
    setSelectionError(null);
    setSelectAll(false);
    setSelectedTlds((prev) => (prev.includes(tld) ? prev.filter((t) => t !== tld) : [...prev, tld]));
  };
  const save = () => {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      if (form.editingId) {
        const res = await adminUpdatePricingRule(form.editingId, commonRuleFields());
        if (!res.ok) {
          setError(res.error);
          return;
        }
        resetForm();
        router.refresh();
        return;
      }

      const parsed = parseTldSelection({ all: selectAll, tlds: selectedTlds });
      if (!parsed.ok) {
        setSelectionError(parsed.error);
        return;
      }
      const res = await adminCreatePricingRulesForTlds({
        operation: form.operation as (typeof OPERATIONS)[number],
        currencyCode: form.currencyCode.trim().toUpperCase() || "SEK",
        appliesToPremium: form.appliesToPremium,
        selection: { all: selectAll, tlds: selectedTlds },
        ...commonRuleFields(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const made = res.data.created.map((c) => (c.tld == null ? "Alla" : `.${c.tld}`)).join(", ");
      const skipped = res.data.skipped.map((s) => (s.tld == null ? "Alla" : `.${s.tld}`)).join(", ");
      setNotice(`Skapade regel för: ${made}.` + (skipped ? ` Hoppade över (konflikt): ${skipped}.` : ""));
      resetForm();
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
    setSelectAll(false);
    setSelectedTlds([]);
    setSelectionError(null);
    setHostupPreview(null);
    setManualPreview(null);
    setForm({
      editingId: r.id,
      operation: r.operation,
      calculationType: r.calculation_type,
      editingTld: r.tld,
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

  const previewInputBase = () => ({
    operation: form.operation as (typeof OPERATIONS)[number],
    calculationType: form.calculationType as (typeof CALC_TYPES)[number],
    years: form.fixedPriceYears.trim() === "" ? 1 : Number(form.fixedPriceYears),
    currencyCode: form.currencyCode.trim().toUpperCase() || "SEK",
    premium: form.appliesToPremium,
    appliesToPremium: form.appliesToPremium,
    fixedCustomerPriceMinor: krToMinor(form.fixedKr),
    fixedPriceYears: form.fixedPriceYears.trim() === "" ? null : Number(form.fixedPriceYears),
    markupFixedMinor: krToMinor(form.markupFixedKr),
    markupPercentageBasisPoints: pctToBps(form.percent),
    minimumCustomerPriceMinor: krToMinor(form.minKr),
  });

  const runHostupPreview = () => {
    const tld = normalizeTld(previewTld) ?? (selectedTlds.length === 1 ? selectedTlds[0] : "");
    if (!tld) {
      setPreviewError("Ange en TLD att hämta pris för.");
      return;
    }
    startPreview(async () => {
      setPreviewError(null);
      const res = await adminPreviewPricingWithHostup({ ...previewInputBase(), tld });
      if (!res.ok) {
        setHostupPreview(null);
        setPreviewError(res.error);
        return;
      }
      setHostupPreview(res.data);
    });
  };

  const runManualPreview = () => {
    startManual(async () => {
      setManualError(null);
      const providerAmountMinor = krToMinor(providerKr);
      if (providerAmountMinor == null || providerAmountMinor < 0) {
        setManualError("Ange ett giltigt providerpris i kronor.");
        return;
      }
      const res = await adminPreviewPricing({ ...previewInputBase(), tld: normalizeTld(previewTld), providerAmountMinor });
      if (!res.ok) {
        setManualPreview(null);
        setManualError(res.error);
        return;
      }
      setManualPreview(res.data);
    });
  };

  const showFixed = form.calculationType === "fixed";
  const showFixedMarkup = form.calculationType === "fixed_markup" || form.calculationType === "fixed_and_percentage";
  const showPercent = form.calculationType === "percentage_markup" || form.calculationType === "fixed_and_percentage";
  const isEditing = !!form.editingId;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{notice}</div>}

      {/* ── Form card ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEditing ? "Redigera prisregel" : "Ny prisregel"}</h2>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Section 1 — Regelidentitet */}
          <div>
            <p className={sectionLabel}>Regelidentitet</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className={labelCls}>Operation</label>
                <Select value={form.operation} disabled={isEditing} onValueChange={(v) => set({ operation: v })}>
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

              {/* TLD: multi-select on create; locked single value on edit */}
              <div className="sm:col-span-2">
                <label className={labelCls}>TLD</label>
                {isEditing ? (
                  <input className={`${inputCls} bg-gray-50`} value={form.editingTld ? `.${form.editingTld}` : "Alla (standard)"} disabled readOnly />
                ) : (
                  <div className="relative" ref={tldPickerRef}>
                    <button
                      type="button"
                      className={`${inputCls} flex items-center justify-between text-left`}
                      onClick={() => setTldPickerOpen((o) => !o)}
                      aria-haspopup="listbox"
                      aria-expanded={tldPickerOpen}
                    >
                      <span className={`truncate ${selectAll || selectedTlds.length > 0 ? "text-gray-900" : "text-gray-400"}`}>
                        {selectAll
                          ? "Alla (standardregel)"
                          : selectedTlds.length === 0
                            ? "Välj TLD:er…"
                            : selectedTlds.map((t) => `.${t}`).join(", ")}
                      </span>
                      <span className="ml-2 text-gray-400">▾</span>
                    </button>

                    {tldPickerOpen && (
                      <div className="absolute z-30 mt-1 w-full min-w-[16rem] rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                        <label
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                            allConflict ? "cursor-not-allowed text-gray-400" : "cursor-pointer hover:bg-gray-50 text-gray-800"
                          }`}
                        >
                          <input type="checkbox" checked={selectAll} disabled={allConflict} onChange={toggleAll} />
                          <span className="font-medium">Alla</span>
                        </label>
                        <div className="my-1 border-t border-gray-100" />
                        <input
                          className={`${inputCls} mb-2`}
                          placeholder="Filtrera…"
                          value={tldFilter}
                          onChange={(e) => setTldFilter(e.target.value)}
                          aria-label="Filtrera TLD:er"
                        />
                        <div className="max-h-48 overflow-y-auto">
                          {tldMenu.map((t) => {
                            const conflict = specificConflicts.includes(t);
                            return (
                              <label key={t} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                                <span className="flex items-center gap-2">
                                  <input type="checkbox" checked={selectedTlds.includes(t)} onChange={() => toggleTld(t)} />
                                  .{t}
                                </span>
                                {conflict && <span className="text-xs text-amber-600">finns redan</span>}
                              </label>
                            );
                          })}
                          {tldMenu.length === 0 && <p className="px-2 py-2 text-xs text-gray-400">Inga träffar.</p>}
                        </div>
                      </div>
                    )}

{specificConflicts.length > 0 && !selectAll && (
                      <p className="mt-1 text-xs text-amber-600">
                        Finns redan för: {specificConflicts.map((t) => `.${t}`).join(", ")} — dessa hoppas över.
                      </p>
                    )}
                    {selectionError && <p className="mt-1 text-xs text-red-600">{selectionError}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Valuta</label>
                <input className={`${inputCls} bg-gray-50`} value={form.currencyCode} disabled readOnly />
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={form.appliesToPremium}
                  disabled={isEditing}
                  onChange={(e) => set({ appliesToPremium: e.target.checked })}
                />
                Gäller premiumdomäner
              </label>
            </div>
          </div>

          {/* Section 2 — Prisberäkning */}
          <div className="border-t border-gray-100 pt-5">
            <p className={sectionLabel}>Prisberäkning</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Beräkningsmetod</label>
                <Select value={form.calculationType} onValueChange={(v) => set({ calculationType: v })}>
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
                    <input className={inputCls} inputMode="decimal" placeholder="149.00" value={form.fixedKr} onChange={(e) => set({ fixedKr: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Gäller antal år</label>
                    <input className={inputCls} inputMode="numeric" value={form.fixedPriceYears} onChange={(e) => set({ fixedPriceYears: e.target.value })} />
                  </div>
                </>
              )}
              {showFixedMarkup && (
                <div>
                  <label className={labelCls}>Fast påslag (kr)</label>
                  <input className={inputCls} inputMode="decimal" placeholder="50.00" value={form.markupFixedKr} onChange={(e) => set({ markupFixedKr: e.target.value })} />
                </div>
              )}
              {showPercent && (
                <div>
                  <label className={labelCls}>Procentpåslag (%)</label>
                  <input className={inputCls} inputMode="decimal" placeholder="20" value={form.percent} onChange={(e) => set({ percent: e.target.value })} />
                </div>
              )}
              <div>
                <label className={labelCls}>Minimipris</label>
                <input className={inputCls} inputMode="decimal" placeholder="—" value={form.minKr} onChange={(e) => set({ minKr: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Section 3 — Period */}
          <div className="border-t border-gray-100 pt-5">
            <p className={sectionLabel}>
              Period
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateField label="Startdatum" value={form.startsAt} onChange={(v) => set({ startsAt: v })} />
              <DateField label="Slutdatum" value={form.endsAt} onChange={(v) => set({ endsAt: v })} />
            </div>
          </div>

          {/* Section 4 — Pris från Hostup (default) */}
          <div className="border-t border-gray-100 pt-5">
            <p className={sectionLabel}>Pris från Hostup</p>
            <p className="mb-3 text-xs text-gray-500">
              Hämtar Hostups aktuella leverantörspris för vald TLD och operation och beräknar kundpriset med regeln ovan.
              Providerpris och marginal visas endast här.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={labelCls}>TLD att hämta</label>
                <input
                  className={`${inputCls} w-40`}
                  placeholder={selectedTlds.length === 1 ? `.${selectedTlds[0]}` : "se"}
                  value={previewTld}
                  onChange={(e) => setPreviewTld(e.target.value)}
                />
              </div>
              <button className={btnGhost} disabled={previewPending} onClick={runHostupPreview}>
                {previewPending ? "Hämtar…" : "Hämta Hostup-pris"}
              </button>
            </div>
            {previewError && <p className="mt-3 text-sm text-red-700">{previewError}</p>}

            {hostupPreview && (
              <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 space-y-3">
                <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-4">
                  <dt className="text-gray-500">Hostup registrering</dt>
                  <dd className="text-gray-900">{formatMinor(hostupPreview.hostup.registerMinor, hostupPreview.hostup.currencyCode ?? "SEK")}</dd>
                  <dt className="text-gray-500">Hostup förnyelse</dt>
                  <dd className="text-gray-900">{formatMinor(hostupPreview.hostup.renewMinor, hostupPreview.hostup.currencyCode ?? "SEK")}</dd>
                  <dt className="text-gray-500">Hostup transfer</dt>
                  <dd className="text-gray-900">
                    {hostupPreview.hostup.transferAvailable
                      ? formatMinor(hostupPreview.hostup.transferMinor, hostupPreview.hostup.currencyCode ?? "SEK")
                      : "Ej tillgängligt"}
                  </dd>
                  <dt className="text-gray-500">Valuta</dt>
                  <dd className="text-gray-900">{hostupPreview.hostup.currencyCode ?? "—"}</dd>
                  <dt className="text-gray-500">Premium</dt>
                  <dd className="text-gray-900">
                    {hostupPreview.hostup.premium == null ? "Standard" : hostupPreview.hostup.premium ? "Ja" : "Nej"}
                  </dd>
                </dl>
                <div className="border-t border-gray-200 pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    Kundpris för {OP_LABEL[hostupPreview.preview?.operation ?? form.operation]}
                  </p>
                  <PreviewBreakdown preview={hostupPreview.preview} unavailable={hostupPreview.operationPriceUnavailable} providerLabel="Hostups verkliga pris" />
                </div>
              </div>
            )}
          </div>

          {/* Section 5 — Avancerat: manuell test-preview (collapsible) */}
          <div className="border-t border-gray-100 pt-5">
            <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowAdvanced((s) => !s)} aria-expanded={showAdvanced}>
              <span className={`${sectionLabel} mb-0`}>Avancerat: manuell test-preview</span>
              <span className="text-gray-400">{showAdvanced ? "▲" : "▼"}</span>
            </button>
            {showAdvanced && (
              <div className="mt-3">
                <p className="mb-3 text-xs text-gray-500">Testa med ett hypotetiskt providerpris utan att kontakta Hostup.</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className={labelCls}>Hypotetiskt providerpris (kr)</label>
                    <input className={`${inputCls} w-40`} inputMode="decimal" value={providerKr} onChange={(e) => setProviderKr(e.target.value)} />
                  </div>
                  <button className={btnGhost} disabled={manualPending} onClick={runManualPreview}>
                    {manualPending ? "Beräknar…" : "Beräkna"}
                  </button>
                </div>
                {manualError && <p className="mt-3 text-sm text-red-700">{manualError}</p>}
                {manualPreview && (
                  <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                    <PreviewBreakdown preview={manualPreview} unavailable={false} providerLabel="Providerpris (test)" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button className={btnPrimary} disabled={pending} onClick={save}>
            {pending ? "Sparar…" : isEditing ? "Spara ändringar" : "Skapa regel"}
          </button>
          {isEditing && (
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={resetForm}>
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
                      {r.tld ? `.${r.tld}` : <span className="font-sans font-normal text-gray-400">Alla (standard)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{OP_LABEL[r.operation] ?? r.operation}</td>
                    <td className="px-4 py-3 text-gray-600">{CALC_LABEL[r.calculation_type] ?? r.calculation_type}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{ruleValueSummary(r)}</td>
                    <td className="px-4 py-3 text-gray-500 text-center">{r.applies_to_premium ? "Ja" : "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.is_active ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium" onClick={() => editRule(r)}>
                          Redigera
                        </button>
                        <button className="text-xs text-gray-500 hover:text-gray-800 font-medium disabled:opacity-40" disabled={pending} onClick={() => toggleActive(r.id, !r.is_active)}>
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

function PreviewBreakdown({
  preview,
  unavailable,
  providerLabel,
}: {
  preview: AdminPricePreview | null;
  unavailable: boolean;
  providerLabel: string;
}) {
  if (unavailable) return <p className="text-sm text-gray-500">Hostup prissätter inte denna operation för denna TLD.</p>;
  if (!preview) return <p className="text-sm text-gray-500">Ingen prisberäkning.</p>;
  const cur = preview.currencyCode;
  if (preview.premiumRequiresManualPrice) return <p className="text-sm text-amber-700">Premiumdomän — kräver manuellt pris.</p>;
  if (!preview.priceConfigured || !preview.customerNet) return <p className="text-sm text-gray-500">Pris ej konfigurerat för denna regel/period.</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-4">
      <dt className="text-gray-500">{providerLabel}</dt>
      <dd className="font-medium text-gray-900">{formatMinor(preview.providerAmountMinor, cur)}</dd>
      <dt className="text-gray-500">Intenzzes påslag</dt>
      <dd className="text-gray-700">{formatMinor(preview.marginAmountMinor, cur)}</dd>
      <dt className="text-gray-500">Kundpris exkl. moms</dt>
      <dd className="font-medium text-gray-900">{formatMinor(preview.customerNet.netAmountMinor, cur)}</dd>
      <dt className="text-gray-500">Moms</dt>
      <dd className="text-gray-700">{formatMinor(preview.customerNet.vatAmountMinor, cur)}</dd>
      <dt className="text-gray-500">Kundpris inkl. moms</dt>
      <dd className="font-semibold text-gray-900">{formatMinor(preview.customerNet.grossAmountMinor, cur)}</dd>
      <dt className="text-gray-500">Marginal</dt>
      <dd className="text-gray-700">{formatBasisPoints(preview.marginBasisPoints)}</dd>
    </dl>
  );
}
