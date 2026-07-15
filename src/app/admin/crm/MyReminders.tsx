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
 * "Mina påminnelser" — a compact stat card (like the CRM overview cards) showing
 * how many of the logged-in user's OWN reminders are overdue (missed). Scoped to
 * created_by on the server (see crm/page.tsx). The company-wide "Försenade"
 * total lives on /admin/sales for admins.
 */
export default function MyReminders({ reminders }: { reminders: MyReminderRow[] }) {
  const today = todayStockholm();
  const missed = reminders.filter((r) => r.reminder_date < today).length;
  const total = reminders.length;

  return (
    <div className="mb-6 sm:max-w-xs">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Mina påminnelser</p>
          {missed > 0 && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
              Försenade
            </span>
          )}
        </div>
        <p className={`text-2xl font-bold ${missed > 0 ? "text-rose-600" : "text-slate-800"}`}>{missed}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {missed > 0
            ? `${missed} missad${missed === 1 ? "" : "e"} av ${total} aktiva`
            : total > 0
            ? `${total} aktiva · inga missade`
            : "Inga aktiva påminnelser"}
        </p>
      </div>
    </div>
  );
}
