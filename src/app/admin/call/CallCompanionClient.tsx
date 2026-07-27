"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAgentCallSession } from "@/lib/useAgentCallSession";
import { normalizePhoneForTel } from "@/lib/phone";
import type { CallOutcome } from "@/types/database";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

type OutcomeOption = {
  value: CallOutcome;
  label: string;
  iconPath: string;
  normalCls: string;
  selectedCls: string;
};

const OUTCOMES: OutcomeOption[] = [
  {
    value: "interested",
    label: "Intresserad",
    iconPath: "M5 13l4 4L19 7",
    normalCls:
      "bg-emerald-50 border border-emerald-200/80 text-emerald-700 hover:bg-emerald-100/70",
    selectedCls:
      "bg-emerald-100 border border-emerald-300 text-emerald-800 ring-2 ring-offset-2 ring-emerald-400",
  },
  {
    value: "call_back",
    label: "Återuppring",
    iconPath:
      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    normalCls:
      "bg-blue-50 border border-blue-200/80 text-blue-700 hover:bg-blue-100/70",
    selectedCls:
      "bg-blue-100 border border-blue-300 text-blue-800 ring-2 ring-offset-2 ring-blue-400",
  },
  {
    value: "no_answer",
    label: "Inget svar",
    iconPath:
      "M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    normalCls:
      "bg-amber-50 border border-amber-200/80 text-amber-700 hover:bg-amber-100/70",
    selectedCls:
      "bg-amber-100 border border-amber-300 text-amber-800 ring-2 ring-offset-2 ring-amber-400",
  },
  {
    value: "not_interested",
    label: "Inte intresserad",
    iconPath: "M6 18L18 6M6 6l12 12",
    normalCls:
      "bg-rose-50 border border-rose-200/80 text-rose-700 hover:bg-rose-100/70",
    selectedCls:
      "bg-rose-100 border border-rose-300 text-rose-800 ring-2 ring-offset-2 ring-rose-400",
  },
];

function stockholmToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm" }).format(new Date());
}

function initials(c: MiniCustomer): string {
  return `${c.first_name.charAt(0)}${c.last_name.charAt(0)}`.toUpperCase();
}

function toISODate(d: Date): string {
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

/**
 * Numeric time input (HH:MM, 24-h). Accepts raw digits and auto-inserts `:`.
 * "0100" → "01:00", "1500" → "15:00". Normalises on blur.
 */
function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [display, setDisplay] = useState(value);

  // Sync when parent resets the value (e.g. after save).
  useEffect(() => {
    setDisplay(value);
  }, [value]);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    const next = digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
    setDisplay(next);
    if (digits.length === 4) {
      const h = parseInt(digits.slice(0, 2), 10);
      const m = parseInt(digits.slice(2), 10);
      if (h <= 23 && m <= 59) onChange(`${digits.slice(0, 2)}:${digits.slice(2)}`);
    } else if (digits.length === 0) {
      onChange("");
    }
  }

  function handleBlur() {
    const digits = display.replace(/\D/g, "");
    if (!digits) { setDisplay(""); onChange(""); return; }
    const hh = digits.slice(0, 2).padStart(2, "0");
    const mm = (digits.slice(2, 4) || "00").padStart(2, "0");
    if (parseInt(hh, 10) > 23 || parseInt(mm, 10) > 59) {
      setDisplay(value); // revert to last committed value
      return;
    }
    const result = `${hh}:${mm}`;
    setDisplay(result);
    onChange(result);
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="HH:MM"
          maxLength={5}
          className={`w-full px-3 py-2.5 pr-9 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/60 placeholder:text-slate-300 tabular-nums transition-all ${
            display ? "border-slate-200 text-slate-900" : "border-slate-200 text-slate-400"
          }`}
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const date = parseISODate(value);
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-left transition-all focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 bg-slate-50/60 ${
              date ? "text-slate-900" : "text-slate-400"
            }`}
          >
            <span className="truncate">
              {date ? date.toLocaleDateString("sv-SE") : "Välj datum"}
            </span>
            <svg
              className="size-4 flex-shrink-0 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="date-popover-content z-[60] w-auto rounded-2xl border border-slate-200 p-0 shadow-xl"
          align="start"
          side="top"
          sideOffset={8}
        >
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            disabled={minDate ? (d) => d < minDate : undefined}
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

export default function CallCompanionClient() {
  const router = useRouter();
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
  const [pendingOutcome, setPendingOutcome] = useState<CallOutcome | null>(null);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");

  const sessionId = session?.id ?? null;
  const activeCustomerId = session?.active_customer_id ?? null;
  const activeCallId = session?.active_call_id ?? null;
  const version = session?.version ?? 0;
  const state = session?.state ?? "idle";
  const offline = conn === "offline";

  // Load active customer when it changes.
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

  // Load earliest overdue reminder + latest note for active customer.
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
        if (!cancelled)
          setLatestNote((data as { description: string } | null)?.description ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCustomerId]);

  // Reset per-call transient UI on new active call.
  useEffect(() => {
    setNote("");
    setMessage(null);
    setExpandInfo(false);
    setPendingOutcome(null);
    setRDate("");
    setRTime("");
  }, [activeCallId]);

  // Auto-dismiss success toast.
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

  const outcomesDisabled =
    busy || offline || !activeCustomerId || customerMissing || state === "wrap_up";
  const nextDisabled = busy || offline || !sessionId || state !== "wrap_up";
  const callBackInvalid = pendingOutcome === "call_back" && (!rDate || !rTime || !note.trim());
  const interestedInvalid =
    pendingOutcome === "interested" && ((!!rDate && !rTime) || (!rDate && !!rTime));

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-900">Call Companion</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                conn === "connected"
                  ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                  : conn === "offline"
                  ? "bg-rose-400"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="font-medium">
              {conn === "connected" ? "Live" : conn === "offline" ? "Offline" : "…"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => router.push("/admin/crm")}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Avsluta Call Companion"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Avsluta
          </button>
        </div>
      </div>

      {/* ── Offline banner ─────────────────────────────────────────────────── */}
      {offline && (
        <div className="flex items-center gap-2 bg-rose-50 border-b border-rose-200/70 text-rose-600 text-xs px-4 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          Offline — återansluter…
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-5 py-6 gap-4">
        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
            <p className="text-sm">Laddar…</p>
          </div>
        ) : !session ? (
          /* No session */
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
              <svg
                className="w-8 h-8 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold">Ingen aktiv session</p>
            <p className="text-slate-400 text-sm">Tryck på "Start Calling" i CRM-vyn</p>
          </div>
        ) : customerMissing ? (
          /* Customer deleted */
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-1">
              <svg
                className="w-8 h-8 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold">Kunden borttagen</p>
            <p className="text-slate-400 text-sm">Denna lead är inte längre tillgänglig</p>
          </div>
        ) : !activeCustomerId ? (
          /* Queue empty / wrap-up */
          <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-1">
              <svg
                className="w-8 h-8 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold">
              {state === "wrap_up" ? "Sparat" : "Inga fler kunder att ringa"}
            </p>
          </div>
        ) : (
          <>
            {/* ── Customer card ─────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0">
                  {customer ? (
                    initials(customer)
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                </div>
                <div className="min-w-0 pt-0.5">
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">
                    {customer ? `${customer.first_name} ${customer.last_name}` : "…"}
                  </h1>
                  {customer?.company_name && (
                    <p className="text-sm text-slate-500 mt-0.5 truncate">{customer.company_name}</p>
                  )}
                  {customer?.phone && (
                    <p className="text-sm text-slate-600 mt-1 tabular-nums font-medium">
                      {customer.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Context: reminder + latest note ───────────────────────── */}
            {(reminder || latestNote) && (
              <button
                type="button"
                onClick={() => setExpandInfo((s) => !s)}
                className="text-left bg-amber-50/80 border border-amber-200/60 rounded-2xl px-4 py-3.5 space-y-1.5 hover:bg-amber-100/60 transition-colors cursor-pointer"
              >
                {reminder && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-amber-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-xs font-semibold text-amber-700">
                      Återuppringning: {reminder.reminder_date}
                      {reminder.reminder_time ? ` kl ${reminder.reminder_time}` : ""}
                    </p>
                  </div>
                )}
                {latestNote && (
                  <p
                    className={`text-sm text-slate-600 whitespace-pre-wrap leading-relaxed ${
                      expandInfo ? "" : "line-clamp-3"
                    }`}
                  >
                    {latestNote}
                  </p>
                )}
              </button>
            )}

            {/* ── Ring button ────────────────────────────────────────────── */}
            {telHref ? (
              <a
                href={telHref}
                className="flex items-center justify-center gap-3 w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl text-lg font-bold shadow-md hover:shadow-lg transition-all"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Ring
              </a>
            ) : (
              <div className="flex items-center justify-center gap-3 w-full py-5 bg-slate-100 text-slate-400 rounded-2xl text-lg font-bold">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Inget telefonnummer
              </div>
            )}

            {/* ── Wrap-up pill ───────────────────────────────────────────── */}
            {state === "wrap_up" && (
              <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-2xl px-4 py-3 text-sm font-medium">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Sparat — tryck Nästa kund
              </div>
            )}

            {/* ── Outcome buttons ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => handleOutcomeClick(o.value)}
                  disabled={outcomesDisabled}
                  className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    pendingOutcome === o.value ? o.selectedCls : o.normalCls
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={o.iconPath} />
                  </svg>
                  {o.label}
                </button>
              ))}
            </div>

            {/* ── Inline reminder picker ─────────────────────────────────── */}
            {pendingOutcome && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                <p className="text-sm font-semibold text-slate-800">
                  {pendingOutcome === "call_back"
                    ? "Boka återuppringning"
                    : "Lägg till påminnelse (valfritt)"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DateField
                    label="Datum"
                    value={rDate}
                    onChange={setRDate}
                    minDate={parseISODate(stockholmToday())}
                  />
                  <TimeField
                    label="Tid"
                    value={rTime}
                    onChange={setRTime}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    {pendingOutcome === "call_back"
                      ? "Anteckning (krävs)"
                      : "Anteckning (valfritt)"}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder={
                      pendingOutcome === "call_back"
                        ? "Vad handlade samtalet om?"
                        : "Valfri anteckning…"
                    }
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none bg-slate-50/60 placeholder:text-slate-400"
                  />
                  {pendingOutcome === "interested" && (
                    <p className="text-xs text-slate-400 mt-1.5">
                      Lämna datum/tid tomt för att hoppa över påminnelsen.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPendingOutcome(null)}
                    disabled={busy}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={confirmPending}
                    disabled={busy || offline || callBackInvalid || interestedInvalid}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {busy ? "Sparar…" : "Spara"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Standalone note ────────────────────────────────────────── */}
            {!pendingOutcome && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={2000}
                disabled={busy || offline || state === "wrap_up"}
                placeholder="Anteckning sparas med utfallet…"
                className="w-full px-4 py-3 text-sm border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none disabled:opacity-40 bg-white shadow-sm placeholder:text-slate-400 transition-all"
              />
            )}
          </>
        )}

        {/* ── Error / info message ───────────────────────────────────────── */}
        {message && (
          <div className="flex items-center justify-between gap-3 text-sm text-amber-700 bg-amber-50 border border-amber-200/70 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="min-w-0">{message}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-amber-500 hover:text-amber-700 flex-shrink-0 cursor-pointer"
              aria-label="Stäng"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* ── Nästa kund ─────────────────────────────────────────────────── */}
        <div className="mt-auto pt-3">
          <button
            onClick={handleNext}
            disabled={nextDisabled}
            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Nästa kund
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Success toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-slate-900/95 backdrop-blur-sm text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl">
          <svg
            className="w-4 h-4 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
