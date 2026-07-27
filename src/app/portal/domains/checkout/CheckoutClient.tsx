"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Trash2 } from "lucide-react";
import { createCheckout, removeDomainFromCart } from "../actions";
import { formatMinor } from "@/lib/domains/money";
import {
  REGISTRANT_FIELDS,
  missingRegistrantFields,
  type RegistrantContact,
  type RegistrantField,
} from "@/lib/domains/registrant-contact";
import type { CheckoutItem } from "@/lib/domains/checkout-service";

/** mm:ss remaining until `ms`, clamped at 0. */
function countdown(ms: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((ms - nowMs) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function CheckoutClient({
  items,
  currencyCode,
  totalVatMinor,
  totalGrossMinor,
  isCustomerView,
  registrant,
  missingFields,
}: {
  items: CheckoutItem[];
  currencyCode: string;
  totalVatMinor: number;
  totalGrossMinor: number;
  isCustomerView: boolean;
  registrant: RegistrantContact;
  missingFields: RegistrantField[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<RegistrantContact>(registrant);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [, startRemove] = useTransition();
  const [now, setNow] = useState<number>(() => Date.now());

  // Tick every second for the reservation countdown; re-fetch when one expires.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (items.some((i) => i.expiresAtMs <= now)) router.refresh();
  }, [now, items, router]);

  const set = (key: RegistrantField, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const stillMissing = missingRegistrantFields(form);
  const allPriced = items.length > 0 && items.every((i) => i.priceConfigured);
  const payable = allPriced && !isCustomerView && stillMissing.length === 0;

  const remove = (name: string) => {
    setRemoving(name);
    startRemove(async () => {
      await removeDomainFromCart(name);
      setRemoving(null);
      router.refresh();
    });
  };

  const onPay = () => {
    if (isCustomerView) return;
    startTransition(async () => {
      setError(null);
      const res = await createCheckout(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.assign(res.data.url);
    });
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="space-y-5">
      {/* Cart items */}
      <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {items.map((it) => (
          <div key={it.domainName} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900">{it.domainName}</div>
              <div className="text-xs text-slate-500">{countdown(it.expiresAtMs, now)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">
                {it.priceConfigured && it.grossAmountMinor != null
                  ? formatMinor(it.grossAmountMinor, currencyCode)
                  : "—"}
              </span>
              <button
                type="button"
                onClick={() => remove(it.domainName)}
                disabled={removing === it.domainName}
                aria-label={`Ta bort ${it.domainName}`}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        {/* Total */}
        <div className="space-y-1 px-5 py-4">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Moms</span>
            <span>{formatMinor(totalVatMinor, currencyCode)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-medium text-slate-600">Totalt</span>
            <span className="font-semibold text-slate-900">{formatMinor(totalGrossMinor, currencyCode)}</span>
          </div>
        </div>
      </div>

      {/* Registrant */}
      <fieldset
        disabled={isCustomerView}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm disabled:opacity-60"
      >
        <legend className="px-1 text-sm font-semibold text-slate-700">Registreringsuppgifter</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {REGISTRANT_FIELDS.map((f) => {
            const wasMissing = missingFields.includes(f.key);
            return (
              <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : undefined}>
                <label htmlFor={`reg-${f.key}`} className="mb-1 block text-xs font-medium text-slate-700">
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </label>
                <input
                  id={`reg-${f.key}`}
                  type={f.key === "email" ? "email" : "text"}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  required={f.required}
                  aria-invalid={f.required && form[f.key].trim() === "" ? true : undefined}
                  className={inputCls}
                  placeholder={wasMissing ? "Fylls i här" : undefined}
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Pay */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onPay}
          disabled={!payable || pending}
          title={
            isCustomerView
              ? "Betalning kan endast göras av kunden"
              : !allPriced
                ? "Någon domän saknar pris"
                : stillMissing.length > 0
                  ? "Fyll i alla obligatoriska uppgifter"
                  : "Öppna Stripe-kassan i testläge"
          }
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:border disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          {pending ? "Öppnar kassan…" : "Betala med kort (testläge)"}
        </button>
        <div aria-live="assertive">
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
