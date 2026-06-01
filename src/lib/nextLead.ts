import type { CallOutcome, CustomerStatus } from "@/types/database";

// Shared, pure (testable) Next Lead rules for the Mobile Call Companion.
// No DB access here — callers build the lookup and pass it in.

const NO_ANSWER_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface CallableCustomer {
  id: string;
  status: CustomerStatus;
  phone: string | null;
  last_call_at: string | null;
  last_call_result: CallOutcome | null;
}

export interface CallableContext {
  customer: CallableCustomer;
  hasActiveFutureReminder: boolean;
}

// "Today" as YYYY-MM-DD in Europe/Stockholm, for comparing against a DATE
// reminder_date (which is stored without a timezone).
export function stockholmToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm" }).format(now);
}

// A reminder blocks calling if it is not completed and dated today or later.
export function hasActiveFutureReminder(
  reminders: { reminder_date: string; is_completed: boolean }[],
  todayStr: string
): boolean {
  return reminders.some((r) => !r.is_completed && r.reminder_date >= todayStr);
}

export function isCallable(ctx: CallableContext, now: Date = new Date()): boolean {
  const c = ctx.customer;
  // Only lead/contacted are callable; negotiating/customer/churned are not.
  if (c.status !== "lead" && c.status !== "contacted") return false;
  if (!c.phone || c.phone.trim() === "") return false;
  if (ctx.hasActiveFutureReminder) return false;
  // Interested is parked until a reminder is set, status moves on, or manual reselect.
  if (c.last_call_result === "interested") return false;
  // No Answer cooldown: exclude for 2 hours after last_call_at.
  if (c.last_call_result === "no_answer" && c.last_call_at) {
    const since = now.getTime() - new Date(c.last_call_at).getTime();
    if (since < NO_ANSWER_COOLDOWN_MS) return false;
  }
  return true;
}

// Scan an ordered id list from startIndex (inclusive) and return the first
// callable entry with its index, or null. ids missing from `lookup`
// (deleted/no longer loaded) are skipped.
export function selectFirstCallable(
  orderedIds: string[],
  startIndex: number,
  lookup: (id: string) => CallableContext | undefined,
  now: Date = new Date()
): { id: string; index: number } | null {
  for (let i = Math.max(0, startIndex); i < orderedIds.length; i++) {
    const ctx = lookup(orderedIds[i]);
    if (ctx && isCallable(ctx, now)) {
      return { id: orderedIds[i], index: i };
    }
  }
  return null;
}
