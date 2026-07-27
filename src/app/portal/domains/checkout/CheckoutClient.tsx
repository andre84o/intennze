"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { createCheckout } from "../actions";

/**
 * Pay button for the checkout page. Calls the server action (which recomputes the
 * price, creates the order + Stripe TEST session server-side) and redirects the
 * browser to the returned Stripe URL. The amount is NEVER sent from here.
 */
export default function CheckoutClient({ canPay }: { canPay: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onPay = () => {
    startTransition(async () => {
      setError(null);
      const res = await createCheckout();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.assign(res.data.url);
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onPay}
        disabled={!canPay || pending}
        title={canPay ? "Öppna Stripe-kassan i testläge" : "Priset är inte konfigurerat"}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        {pending ? "Öppnar kassan…" : "Betala med kort (testläge)"}
      </button>
      <div aria-live="assertive">
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
