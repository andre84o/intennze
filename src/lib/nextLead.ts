import type { CustomerStatus } from "@/types/database";

// Shared, pure (testable) calling rules for the Mobile Call Companion.
// No DB access here — callers build the lookup and pass it in.
//
// Two ways a customer can be served, in priority order:
//   1. Reminder Calling — a due (today) or overdue reminder. Applies to
//      status lead / contacted / negotiating. Overdue first, then due-today
//      sorted by reminder_time.
//   2. Lead Calling — a plain lead (status = lead) with no reminder at all.
// Future reminders park the customer until the reminder becomes due.
// customer / churned are never callable.

const CALLABLE_STATUSES: CustomerStatus[] = ["lead", "contacted", "negotiating"];

export interface CallableCustomer {
  id: string;
  status: CustomerStatus;
  phone: string | null;
}

export interface CallableContext {
  customer: CallableCustomer;
  hasDueOrOverdueReminder: boolean; // not completed, reminder_date <= today
  hasFutureReminder: boolean;       // not completed, reminder_date >  today
}

// "Today" as YYYY-MM-DD in Europe/Stockholm, for comparing against a DATE
// reminder_date (which is stored without a timezone).
export function stockholmToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm" }).format(now);
}

export function isCallable(ctx: CallableContext): boolean {
  const c = ctx.customer;
  if (!c.phone || c.phone.trim() === "") return false;
  if (!CALLABLE_STATUSES.includes(c.status)) return false;
  // Reminder Calling: any callable status with a due/overdue reminder.
  if (ctx.hasDueOrOverdueReminder) return true;
  // A future reminder parks the customer until it becomes due.
  if (ctx.hasFutureReminder) return false;
  // No reminder: only plain leads are callable (regular Lead Calling).
  return c.status === "lead";
}

// Scan an ordered id list from startIndex (inclusive) and return the first
// callable entry with its index, or null. ids missing from `lookup`
// (deleted/no longer loaded) are skipped.
export function selectFirstCallable(
  orderedIds: string[],
  startIndex: number,
  lookup: (id: string) => CallableContext | undefined
): { id: string; index: number } | null {
  for (let i = Math.max(0, startIndex); i < orderedIds.length; i++) {
    const ctx = lookup(orderedIds[i]);
    if (ctx && isCallable(ctx)) {
      return { id: orderedIds[i], index: i };
    }
  }
  return null;
}

// ── Call queue (lead_order snapshot) ─────────────────────────────────────────
// Builds the prioritised id list sent as the session's lead_order:
//   tier 0: overdue reminders (earliest reminder date+time first)
//   tier 1: due-today reminders (earliest reminder_time first)
//   tier 2: plain leads, in the caller's display order
// Customers are passed in display order; that order is the tie-breaker so the
// desktop's existing sort is preserved within a tier.

export interface QueueCustomer {
  id: string;
  status: CustomerStatus;
  phone: string | null;
}

export interface QueueReminder {
  reminder_date: string;        // YYYY-MM-DD
  reminder_time: string | null; // HH:MM or null
  is_completed: boolean;
}

export function buildCallQueue(
  customers: QueueCustomer[],
  remindersByCustomer: Map<string, QueueReminder[]>,
  todayStr: string
): string[] {
  type Entry = { id: string; tier: number; key: string; idx: number };
  const entries: Entry[] = [];

  customers.forEach((c, idx) => {
    if (!c.phone || c.phone.trim() === "") return;
    if (!CALLABLE_STATUSES.includes(c.status)) return;

    const rems = (remindersByCustomer.get(c.id) ?? []).filter((r) => !r.is_completed);
    const overdue = rems.filter((r) => r.reminder_date < todayStr);
    const dueToday = rems.filter((r) => r.reminder_date === todayStr);
    const hasFuture = rems.some((r) => r.reminder_date > todayStr);

    if (overdue.length > 0) {
      const key = overdue
        .map((r) => `${r.reminder_date} ${r.reminder_time ?? "00:00"}`)
        .sort()[0];
      entries.push({ id: c.id, tier: 0, key, idx });
    } else if (dueToday.length > 0) {
      const key = dueToday.map((r) => r.reminder_time ?? "00:00").sort()[0];
      entries.push({ id: c.id, tier: 1, key, idx });
    } else if (hasFuture) {
      return; // parked until the reminder becomes due
    } else if (c.status === "lead") {
      entries.push({ id: c.id, tier: 2, key: "", idx });
    }
    // contacted / negotiating without a due reminder are not callable.
  });

  entries.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.key !== b.key) return a.key.localeCompare(b.key);
    return a.idx - b.idx;
  });

  return entries.map((e) => e.id);
}
