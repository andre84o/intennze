"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { createCheckout } from "../actions";
import {
  REGISTRANT_FIELDS,
  missingRegistrantFields,
  type RegistrantContact,
  type RegistrantField,
} from "@/lib/domains/registrant-contact";

/**
 * Checkout registrant form + pay button. The contact is pre-filled from the
 * customer's existing details; missing fields are completed here. The amount is
 * NEVER sent from the client — the server recomputes it. Payment is disabled in
 * admin customer-view (the server also blocks it).
 */
export default function CheckoutClient({
  canPay,
  isCustomerView,
  registrant,
  missingFields,
}: {
  canPay: boolean;
  isCustomerView: boolean;
  registrant: RegistrantContact;
  missingFields: RegistrantField[];
}) {
  const [form, setForm] = useState<RegistrantContact>(registrant);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: RegistrantField, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const stillMissing = missingRegistrantFields(form);
  const payable = canPay && !isCustomerView && stillMissing.length === 0;

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
      <fieldset
        disabled={isCustomerView}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm disabled:opacity-60"
      >
        <legend className="px-1 text-sm font-semibold text-slate-700">Registreringsuppgifter</legend>
        <p className="mb-4 text-xs text-slate-500">
          Förifyllt från dina uppgifter. Komplettera det som saknas.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="space-y-3">
        <button
          type="button"
          onClick={onPay}
          disabled={!payable || pending}
          title={
            isCustomerView
              ? "Betalning kan endast göras av kunden"
              : !canPay
                ? "Priset är inte konfigurerat"
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
