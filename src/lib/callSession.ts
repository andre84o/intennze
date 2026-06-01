import type { SupabaseClient } from "@supabase/supabase-js";
import {
  stockholmToday,
  selectFirstCallable,
  type CallableContext,
  type CallableCustomer,
} from "./nextLead";

// Server-side helpers shared by the call session endpoints. Each takes the
// per-request authenticated Supabase client so RLS still applies.

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

export interface MinimalLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

export async function minimalLead(
  supabase: SupabaseClient,
  id: string
): Promise<MinimalLead | null> {
  const { data } = await supabase
    .from("customers")
    .select("id, first_name, last_name, phone")
    .eq("id", id)
    .maybeSingle();
  return (data as MinimalLead | null) ?? null;
}

// Next version number for an agent's session (0 if no session yet).
export async function nextVersion(
  supabase: SupabaseClient,
  agentId: string
): Promise<number> {
  const { data } = await supabase
    .from("call_sessions")
    .select("version")
    .eq("agent_id", agentId)
    .maybeSingle();
  const current = (data?.version as number | undefined) ?? -1;
  return current + 1;
}

// Build a live lookup over candidate ids (status, phone, and whether they have
// a due/overdue or future reminder) and return the first callable one
// at-or-after startIndex, re-validating every candidate against the rules.
export async function pickFirstCallable(
  supabase: SupabaseClient,
  orderedIds: string[],
  startIndex: number,
  now: Date = new Date()
): Promise<{ id: string; index: number } | null> {
  if (orderedIds.length === 0 || startIndex >= orderedIds.length) return null;
  const candidates = orderedIds.slice(Math.max(0, startIndex));

  const { data: customers } = await supabase
    .from("customers")
    .select("id, status, phone")
    .in("id", candidates);

  const { data: reminders } = await supabase
    .from("reminders")
    .select("customer_id, reminder_date")
    .in("customer_id", candidates)
    .eq("is_completed", false);

  const today = stockholmToday(now);
  const datesByCustomer = new Map<string, string[]>();
  for (const r of reminders ?? []) {
    const row = r as { customer_id: string; reminder_date: string };
    const arr = datesByCustomer.get(row.customer_id) ?? [];
    arr.push(row.reminder_date);
    datesByCustomer.set(row.customer_id, arr);
  }

  const ctxById = new Map<string, CallableContext>();
  for (const c of customers ?? []) {
    const cust = c as CallableCustomer;
    const dates = datesByCustomer.get(cust.id) ?? [];
    ctxById.set(cust.id, {
      customer: cust,
      hasDueOrOverdueReminder: dates.some((d) => d <= today),
      hasFutureReminder: dates.some((d) => d > today),
    });
  }

  return selectFirstCallable(orderedIds, startIndex, (id) => ctxById.get(id));
}
