"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAgentCallSession } from "@/lib/useAgentCallSession";
import { normalizePhoneForTel } from "@/lib/phone";
import type { CallOutcome } from "@/types/database";

interface MiniCustomer {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  phone: string | null;
}

const OUTCOMES: { value: CallOutcome; label: string; cls: string }[] = [
  { value: "interested", label: "Interested", cls: "bg-green-600 hover:bg-green-700" },
  { value: "call_back", label: "Call Back", cls: "bg-blue-600 hover:bg-blue-700" },
  { value: "no_answer", label: "No Answer", cls: "bg-amber-500 hover:bg-amber-600" },
  { value: "not_interested", label: "Not Interested", cls: "bg-rose-600 hover:bg-rose-700" },
];

export default function CallCompanionClient() {
  const { session, conn, loading, refetch } = useAgentCallSession();
  const [customer, setCustomer] = useState<MiniCustomer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sessionId = session?.id ?? null;
  const activeCustomerId = session?.active_customer_id ?? null;
  const activeCallId = session?.active_call_id ?? null;
  const version = session?.version ?? 0;
  const state = session?.state ?? "idle";
  const offline = conn === "offline";

  // Render strictly from the session row: load the active customer when it changes.
  useEffect(() => {
    if (!activeCustomerId) {
      setCustomer(null);
      return;
    }
    let cancelled = false;
    setLoadingCustomer(true);
    const sb = createClient();
    sb.from("customers")
      .select("id, first_name, last_name, company_name, phone")
      .eq("id", activeCustomerId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setCustomer((data as MiniCustomer | null) ?? null);
        setLoadingCustomer(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCustomerId]);

  // Clear the note + "Saved" message whenever a new customer becomes active.
  useEffect(() => {
    setNote("");
    setShowNote(false);
    setMessage(null);
  }, [activeCallId]);

  const customerMissing = !!activeCustomerId && !loadingCustomer && customer === null;
  const telHref = customer?.phone ? `tel:${normalizePhoneForTel(customer.phone)}` : null;

  async function handleOutcome(outcome: CallOutcome) {
    if (!sessionId || !activeCustomerId || !activeCallId || busy || offline) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/call/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          customer_id: activeCustomerId,
          active_call_id: activeCallId,
          outcome,
          request_id: crypto.randomUUID(),
          note: note.trim() ? note.trim() : undefined,
        }),
      });
      if (res.status === 409) {
        await refetch();
        setMessage("Session updated. Please try again.");
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Could not save outcome");
      } else {
        setMessage("Saved");
        setNote("");
        setShowNote(false);
      }
    } catch {
      setMessage("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  async function handleNext() {
    if (!sessionId || busy || offline) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/call/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, version }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        await refetch();
        setMessage("Session updated. Please try again.");
      } else if (!res.ok) {
        setMessage(data.error ?? "Could not load next customer");
      } else if (data.none) {
        setMessage("No customers available");
      } else {
        setMessage(null);
      }
    } catch {
      setMessage("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  const outcomesDisabled = busy || offline || !activeCustomerId || customerMissing || state === "wrap_up";

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-900">Call Companion</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span
            className={`w-2 h-2 rounded-full ${conn === "connected" ? "bg-green-500" : conn === "offline" ? "bg-rose-400" : "bg-amber-400"}`}
          />
          {conn === "connected" ? "Online" : conn === "offline" ? "Offline" : "…"}
        </span>
      </div>

      {offline && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-700 text-sm px-4 py-2">
          Offline — reconnecting…
        </div>
      )}

      <div className="flex-1 flex flex-col p-5 gap-5">
        {loading ? (
          <p className="text-slate-400 text-sm mt-10 text-center">Laddar…</p>
        ) : !session ? (
          <p className="text-slate-500 text-sm mt-10 text-center">
            Waiting for a call session. Press “Start Call Session” on the desktop.
          </p>
        ) : customerMissing ? (
          <div className="mt-10 text-center space-y-4">
            <p className="text-slate-700 font-medium">Customer removed</p>
            <p className="text-slate-400 text-sm">This lead is no longer available.</p>
          </div>
        ) : !activeCustomerId ? (
          <div className="mt-10 text-center space-y-2">
            <p className="text-slate-700 font-medium">
              {state === "wrap_up" ? "Saved" : "No customers available"}
            </p>
          </div>
        ) : (
          <>
            {/* Active customer */}
            <div className="mt-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {customer ? `${customer.first_name} ${customer.last_name}` : "…"}
              </h1>
              {customer?.company_name && <p className="text-slate-500">{customer.company_name}</p>}
              {customer?.phone && <p className="text-slate-700 mt-1 tabular-nums">{customer.phone}</p>}
            </div>

            {/* Call */}
            {telHref ? (
              <a
                href={telHref}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-center text-lg font-semibold transition-colors"
              >
                Call
              </a>
            ) : (
              <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl text-center text-lg font-semibold">
                No phone number
              </div>
            )}

            {state === "wrap_up" && (
              <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Saved
              </div>
            )}

            {/* Outcomes */}
            <div className="grid grid-cols-2 gap-3">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => handleOutcome(o.value)}
                  disabled={outcomesDisabled}
                  className={`py-4 rounded-2xl text-white text-base font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${o.cls}`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Add Note (merged into the same call interaction when an outcome is chosen) */}
            <div>
              <button
                onClick={() => setShowNote((s) => !s)}
                disabled={busy || offline || state === "wrap_up"}
                className="text-sm text-slate-600 underline disabled:opacity-40"
              >
                Add Note
              </button>
              {showNote && (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Note saved with the outcome…"
                  className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}
            </div>
          </>
        )}

        {message && (
          <p className={`text-sm text-center ${message === "Saved" ? "text-green-700" : "text-amber-600"}`}>
            {message}
          </p>
        )}

        <div className="mt-auto pt-4">
          <button
            onClick={handleNext}
            disabled={busy || offline || !sessionId}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next Customer
          </button>
        </div>
      </div>
    </div>
  );
}
