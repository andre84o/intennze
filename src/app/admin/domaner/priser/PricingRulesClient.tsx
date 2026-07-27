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

const OPERATIONS = ["register", "renew", "transfer"] as const;
const CALC_TYPES = ["fixed", "fixed_markup", "percentage_markup", "fixed_and_percentage"] as const;
const OP_LABEL: Record<string, string> = { register: "Registrering", renew: "Förnyelse", transfer: "Transfer" };
const CALC_LABEL: Record<string, string> = {
  fixed: "Fast kundpris",
  fixed_markup: "Fast påslag",
  percentage_markup: "Procentpåslag",
  fixed_and_percentage: "Fast + procent",
};

// major-unit (kronor) string → integer minor units (öre); "" → null
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

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const labelCls = "block text-xs font-medium text-gray-500 mb-1";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";
const card = "bg-white border border-gray-200 rounded-xl p-5 shadow-sm";

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

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

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
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* ── Create / edit form ─────────────────────────────────────────── */}
      <div className={card}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {form.editingId ? "Redigera prisregel" : "Ny prisregel"}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Operation</label>
            <select
              className={inputCls}
              value={form.operation}
              disabled={!!form.editingId}
              onChange={(e) => set({ operation: e.target.value })}
            >
              {OPERATIONS.map((o) => (
                <option key={o} value={o}>{OP_LABEL[o]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>TLD (tomt = standardregel)</label>
            <input
              className={inputCls}
              placeholder="se"
              value={form.tld}
              disabled={!!form.editingId}
              onChange={(e) => set({ tld: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Beräkningsmetod</label>
            <select className={inputCls} value={form.calculationType} onChange={(e) => set({ calculationType: e.target.value })}>
              {CALC_TYPES.map((c) => (
                <option key={c} value={c}>{CALC_LABEL[c]}</option>
              ))}
            </select>
          </div>

          {showFixed && (
            <>
              <div>
                <label className={labelCls}>Fast kundpris (kr, exkl. moms)</label>
                <input className={inputCls} inputMode="decimal" value={form.fixedKr} onChange={(e) => set({ fixedKr: e.target.value })} />
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
              <input className={inputCls} inputMode="decimal" value={form.markupFixedKr} onChange={(e) => set({ markupFixedKr: e.target.value })} />
            </div>
          )}
          {showPercent && (
            <div>
              <label className={labelCls}>Procentpåslag (%)</label>
              <input className={inputCls} inputMode="decimal" value={form.percent} onChange={(e) => set({ percent: e.target.value })} />
            </div>
          )}

          <div>
            <label className={labelCls}>Minimipris (kr, valfritt)</label>
            <input className={inputCls} inputMode="decimal" value={form.minKr} onChange={(e) => set({ minKr: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Valuta</label>
            <input className={inputCls} value={form.currencyCode} disabled={!!form.editingId} onChange={(e) => set({ currencyCode: e.target.value })} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={form.appliesToPremium}
                disabled={!!form.editingId}
                onChange={(e) => set({ appliesToPremium: e.target.checked })}
              />
              Gäller premiumdomäner
            </label>
          </div>
          <div>
            <label className={labelCls}>Startdatum (valfritt)</label>
            <input type="date" className={inputCls} value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Slutdatum (valfritt)</label>
            <input type="date" className={inputCls} value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className={btnPrimary} disabled={pending} onClick={save}>
            {pending ? "Sparar…" : form.editingId ? "Spara ändringar" : "Skapa regel"}
          </button>
          {form.editingId && (
            <button
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setForm(EMPTY)}
            >
              Avbryt
            </button>
          )}
        </div>
      </div>

      {/* ── Live preview ───────────────────────────────────────────────── */}
      <div className={card}>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Pris-preview</h2>
        <p className="mb-3 text-xs text-gray-500">
          Använder samma prisberäkning som produktionen på formulärets aktuella regel.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelCls}>Hypotetiskt providerpris (kr)</label>
            <input className={`${inputCls} w-48`} inputMode="decimal" value={providerKr} onChange={(e) => setProviderKr(e.target.value)} />
          </div>
          <button className={btnPrimary} disabled={previewPending} onClick={runPreview}>
            {previewPending ? "Beräknar…" : "Beräkna"}
          </button>
        </div>
        {previewError && <div className="mt-3 text-sm text-red-700">{previewError}</div>}
        {preview && (
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
            <div className="text-gray-500">Providerpris</div>
            <div className="col-span-1 font-medium text-gray-900 sm:col-span-2">
              {formatMinor(preview.providerAmountMinor, preview.currencyCode)}
            </div>
            {preview.premiumRequiresManualPrice ? (
              <div className="col-span-2 text-amber-700 sm:col-span-3">Premiumdomän – kräver manuellt pris.</div>
            ) : !preview.priceConfigured || !preview.customerNet ? (
              <div className="col-span-2 text-gray-500 sm:col-span-3">Pris ej konfigurerat för denna regel/period.</div>
            ) : (
              <>
                <div className="text-gray-500">Kundpris exkl. moms</div>
                <div className="col-span-1 font-medium text-gray-900 sm:col-span-2">
                  {formatMinor(preview.customerNet.netAmountMinor, preview.currencyCode)}
                </div>
                <div className="text-gray-500">Moms</div>
                <div className="col-span-1 text-gray-700 sm:col-span-2">
                  {formatMinor(preview.customerNet.vatAmountMinor, preview.currencyCode)}
                </div>
                <div className="text-gray-500">Kundpris inkl. moms</div>
                <div className="col-span-1 font-medium text-gray-900 sm:col-span-2">
                  {formatMinor(preview.customerNet.grossAmountMinor, preview.currencyCode)}
                </div>
                <div className="text-gray-500">Marginal</div>
                <div className="col-span-1 text-gray-700 sm:col-span-2">
                  {formatMinor(preview.marginAmountMinor, preview.currencyCode)} ({formatBasisPoints(preview.marginBasisPoints)})
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Rules list ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {initialRules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Inga prisregler ännu. Om ingen regel finns ser kunden att priset inte är konfigurerat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">TLD</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Operation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Metod</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Värde</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Premium</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {initialRules.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.tld ?? "(standard)"}</td>
                    <td className="px-4 py-3 text-gray-700">{OP_LABEL[r.operation] ?? r.operation}</td>
                    <td className="px-4 py-3 text-gray-700">{CALC_LABEL[r.calculation_type] ?? r.calculation_type}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.calculation_type === "fixed" && formatMinor(Number(r.fixed_customer_price_minor), r.currency_code)}
                      {r.markup_fixed_minor != null && `+${formatMinor(Number(r.markup_fixed_minor), r.currency_code)} `}
                      {r.markup_percentage_basis_points != null && `+${formatBasisPoints(Number(r.markup_percentage_basis_points))}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.applies_to_premium ? "Ja" : "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {r.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-blue-600 hover:underline" onClick={() => editRule(r)}>
                          Redigera
                        </button>
                        <button
                          className="text-gray-600 hover:underline"
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
