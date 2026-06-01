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

interface ActiveReminder {
  reminder_date: string;
  reminder_time: string | null;
  title: string;
}

const OUTCOMES: { value: CallOutcome; label: string; cls: string }[] = [
  { value: "interested", label: "Interested", cls: "bg-green-600 hover:bg-green-700" },
  { value: "call_back", label: "Call Back", cls: "bg-blue-600 hover:bg-blue-700" },
  { value: "no_answer", label: "No Answer", cls: "bg-amber-500 hover:bg-amber-600" },
  { value: "not_interested", label: "Not Interested", cls: "bg-rose-600 hover:bg-rose-700" },
];

// "Today" in Europe/Stockholm (YYYY-MM-DD) — matches the server predicate.
function stockholmToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm" }).format(new Date());
}

export default function CallCompanionClient() {
  const { session, conn, loading, refetch } = useAgentCallSession();
  const [customer, setCustomer] = useState<MiniCustomer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [reminder, setReminder] = useState<ActiveReminder | null>(null);
  const [latestNote, setLatestNote] = useState<string | null>(null);
  const [expandInfo, setExpandInfo] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Inline reminder picker for Call Back (required) / Interested (optional).
  const [pendingOutcome, setPendingOutcome] = useState<CallOutcome | null>(null);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");

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

  // Call-back context for the active customer: the earliest due/overdue reminder
  // and the latest logged note. Same tables (reminders / customer_interactions)
  // the desktop customer card reads, so both views stay consistent.
  useEffect(() => {
    if (!activeCustomerId) {
      setReminder(null);
      setLatestNote(null);
      return;
    }
    let cancelled = false;
    const sb = createClient();
    const today = stockholmToday();
    sb.from("reminders")
      .select("reminder_date, reminder_time, title")
      .eq("customer_id", activeCustomerId)
      .eq("is_completed", false)
      .lte("reminder_date", today)
      .order("reminder_date", { ascending: true })
      .order("reminder_time", { ascending: true, nullsFirst: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setReminder((data as ActiveReminder | null) ?? null);
      });
    sb.from("customer_interactions")
      .select("description")
      .eq("customer_id", activeCustomerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLatestNote((data as { description: string } | null)?.description ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCustomerId]);

  // Reset per-customer transient UI whenever a new call becomes active.
  useEffect(() => {
    setNote("");
    setMessage(null);
    setExpandInfo(false);
    setPendingOutcome(null);
    setRDate("");
    setRTime("");
  }, [activeCallId]);

  // Auto-dismissing success toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const customerMissing = !!activeCustomerId && !loadingCustomer && customer === null;
  const telHref = customer?.phone ? `tel:${normalizePhoneForTel(customer.phone)}` : null;

  async function submitOutcome(
    outcome: CallOutcome,
    extra?: { reminder_date?: string; reminder_time?: string }
  ) {
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
          reminder_date: extra?.reminder_date,
          reminder_time: extra?.reminder_time,
        }),
      });
      if (res.status === 409) {
        await refetch();
        setMessage("Sessionen uppdaterades. Försök igen.");
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Kunde inte spara utfallet");
      } else {
        setToast("Sparat");
        setNote("");
        setPendingOutcome(null);
        setRDate("");
        setRTime("");
      }
    } catch {
      setMessage("Nätverksfel — försök igen");
    } finally {
      setBusy(false);
    }
  }

  function handleOutcomeClick(outcome: CallOutcome) {
    // Call Back / Interested open the inline reminder picker first.
    if (outcome === "call_back" || outcome === "interested") {
      setMessage(null);
      setPendingOutcome((cur) => (cur === outcome ? null : outcome));
      return;
    }
    submitOutcome(outcome);
  }

  function confirmPending() {
    if (!pendingOutcome) return;
    submitOutcome(pendingOutcome, { reminder_date: rDate, reminder_time: rTime });
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
        setMessage("Sessionen uppdaterades. Försök igen.");
      } else if (!res.ok) {
        setMessage(data.error ?? "Kunde inte hämta nästa kund");
      } else if (data.none) {
        setMessage("Inga fler kunder att ringa");
      } else {
        setMessage(null);
      }
    } catch {
      setMessage("Nätverksfel — försök igen");
    } finally {
      setBusy(false);
    }
  }

  const outcomesDisabled = busy || offline || !activeCustomerId || customerMissing || state === "wrap_up";
  // Next is locked until the current call's outcome has been saved (wrap_up).
  const nextDisabled = busy || offline || !sessionId || state !== "wrap_up";

  const callBackInvalid = pendingOutcome === "call_back" && (!rDate || !rTime || !note.trim());
  const interestedInvalid =
    pendingOutcome === "interested" && ((!!rDate && !rTime) || (!rDate && !!rTime));

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
          Offline — återansluter…
        </div>
      )}

      <div className="flex-1 flex flex-col p-5 gap-5">
        {loading ? (
          <p className="text-slate-400 text-sm mt-10 text-center">Laddar…</p>
        ) : !session ? (
          <p className="text-slate-500 text-sm mt-10 text-center">
            Väntar på en samtalssession. Tryck på “Start Calling”.
          </p>
        ) : customerMissing ? (
          <div className="mt-10 text-center space-y-4">
            <p className="text-slate-700 font-medium">Kunden borttagen</p>
            <p className="text-slate-400 text-sm">Denna lead är inte längre tillgänglig.</p>
          </div>
        ) : !activeCustomerId ? (
          <div className="mt-10 text-center space-y-2">
            <p className="text-slate-700 font-medium">
              {state === "wrap_up" ? "Sparat" : "Inga fler kunder att ringa"}
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

            {/* Call-back context (reminder + latest note), max 3 lines, expand on tap */}
            {(reminder || latestNote) && (
              <button
                type="button"
                onClick={() => setExpandInfo((s) => !s)}
                className="text-left bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5"
              >
                {reminder && (
                  <p className="text-xs font-semibold text-amber-700">
                    Återuppringning: {reminder.reminder_date}
                    {reminder.reminder_time ? ` kl ${reminder.reminder_time}` : ""}
                  </p>
                )}
                {latestNote && (
                  <p className={`text-sm text-slate-600 mt-0.5 whitespace-pre-wrap ${expandInfo ? "" : "line-clamp-3"}`}>
                    {latestNote}
                  </p>
                )}
              </button>
            )}

            {/* Call */}
            {telHref ? (
              <a
                href={telHref}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-center text-lg font-semibold transition-colors"
              >
                Ring
              </a>
            ) : (
              <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl text-center text-lg font-semibold">
                Inget telefonnummer
              </div>
            )}

            {state === "wrap_up" && (
              <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Sparat — tryck Nästa kund
              </div>
            )}

            {/* Outcomes */}
            <div className="grid grid-cols-2 gap-3">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => handleOutcomeClick(o.value)}
                  disabled={outcomesDisabled}
                  className={`py-4 rounded-2xl text-white text-base font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${o.cls} ${pendingOutcome === o.value ? "ring-2 ring-offset-2 ring-slate-900" : ""}`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Inline reminder picker for Call Back / Interested */}
            {pendingOutcome && (
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-800">
                  {pendingOutcome === "call_back"
                    ? "Boka återuppringning"
                    : "Påminnelse (valfritt)"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={rDate}
                    min={stockholmToday()}
                    onChange={(e) => setRDate(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    value={rTime}
                    onChange={(e) => setRTime(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={pendingOutcome === "call_back" ? "Anteckning (krävs)…" : "Anteckning (valfritt)…"}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                {pendingOutcome === "interested" && (
                  <p className="text-xs text-slate-400">
                    Lämna datum/tid tomt för att hoppa över påminnelsen.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPendingOutcome(null)}
                    disabled={busy}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={confirmPending}
                    disabled={busy || offline || callBackInvalid || interestedInvalid}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Spara
                  </button>
                </div>
              </div>
            )}

            {/* Add Note (merged into the same call interaction) — hidden while the
                reminder picker is open, which has its own note field. */}
            {!pendingOutcome && (
              <div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  disabled={busy || offline || state === "wrap_up"}
                  placeholder="Anteckning sparas med utfallet…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-40"
                />
              </div>
            )}
          </>
        )}

        {message && (
          <div className="flex items-center justify-between gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-amber-500 hover:text-amber-700 flex-shrink-0" aria-label="Stäng">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className="mt-auto pt-4">
          <button
            onClick={handleNext}
            disabled={nextDisabled}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Nästa kund
          </button>
        </div>
      </div>

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {toast}
        </div>
      )}
    </div>
  );
}
