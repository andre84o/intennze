"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export interface MyReminderRow {
  id: string;
  title: string;
  reminder_date: string;
  reminder_time: string | null;
  type: string | null;
  customerName: string | null;
}

function todayStockholm(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Stockholm" });
}

/**
 * "Mina påminnelser" — the logged-in user's OWN active reminders (scoped by
 * created_by on the server). Shown on the CRM page.
 */
export default function MyReminders({ reminders: initial }: { reminders: MyReminderRow[] }) {
  const [reminders, setReminders] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const today = todayStockholm();

  const complete = async (id: string) => {
    setBusy(id);
    const sb = createClient();
    const { error } = await sb
      .from("reminders")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) setReminders((p) => p.filter((r) => r.id !== id));
    setBusy(null);
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-900">Mina påminnelser</h2>
        {reminders.length > 0 && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
            {reminders.length}
          </span>
        )}
      </div>

      {reminders.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Du har inga aktiva påminnelser.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {reminders.map((r) => {
            const overdue = r.reminder_date < today;
            const isToday = r.reminder_date === today;
            const d = new Date(r.reminder_date);
            return (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className={`flex h-11 w-11 flex-none flex-col items-center justify-center rounded-xl text-center ${
                    overdue
                      ? "bg-rose-50 text-rose-600"
                      : isToday
                      ? "bg-amber-50 text-amber-600"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                  <span className="text-[10px] uppercase">
                    {d.toLocaleDateString("sv-SE", { month: "short" }).replace(".", "")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                  <p className="truncate text-xs text-slate-400">
                    {r.customerName ?? "—"}
                    {r.reminder_time ? ` · ${r.reminder_time.slice(0, 5)}` : ""}
                    {overdue ? " · Försenad" : isToday ? " · Idag" : ""}
                  </p>
                </div>
                <button
                  onClick={() => complete(r.id)}
                  disabled={busy === r.id}
                  className="flex-none rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                >
                  {busy === r.id ? "…" : "Klar"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
