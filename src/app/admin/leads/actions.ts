"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

/**
 * All server actions in this file are Admin-only.
 *
 * The admin layout (src/app/admin/layout.tsx) only checks that a user is
 * logged in — it does NOT check the role. Therefore EVERY action here must
 * independently re-verify, server-side, that the caller is an active admin
 * before touching any data. Never trust the client.
 */

type AdminOk = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };
type AdminFail = { error: string };

/**
 * Verify — server-side — that the current session belongs to an active admin.
 * Returns the session-scoped Supabase client (RLS applies) on success.
 */
async function requireAdmin(): Promise<AdminOk | AdminFail> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Inte inloggad" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin" || profile.is_active !== true) {
    return { error: "Åtkomst nekad" };
  }

  return { supabase, userId: user.id };
}

export interface AssignLeadResult {
  ok: boolean;
  customerId?: string;
  error?: string;
}

/**
 * Create a customer from a lead and assign it to a staff member.
 *
 * Uses the SESSION client so that auth.uid() inside the SECURITY DEFINER RPC
 * resolves to the acting admin. The RPC itself enforces admin + active
 * assignee + status='new' + creates the customer + writes an audit record.
 */
export async function assignLead(
  leadId: string,
  staffId: string,
  firstName: string,
  lastName: string
): Promise<AssignLeadResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  const p_first_name = (firstName ?? "").trim();
  const p_last_name = (lastName ?? "").trim();

  if (!leadId || !staffId) {
    return { ok: false, error: "Lead och mottagare krävs" };
  }
  if (!p_first_name) {
    return { ok: false, error: "Förnamn krävs" };
  }

  const { data, error } = await guard.supabase.rpc("assign_lead", {
    p_lead: leadId,
    p_staff: staffId,
    p_first_name,
    p_last_name,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/leads");
  return { ok: true, customerId: data as string };
}

/**
 * Toggle a lead's read/unread flag. RLS restricts UPDATE to admins.
 */
export async function setLeadRead(
  leadId: string,
  isRead: boolean
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  if (!leadId) return { ok: false, error: "Lead saknas" };

  const { error } = await guard.supabase
    .from("lead_inbox")
    .update({ is_read: isRead })
    .eq("id", leadId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/leads");
  return { ok: true };
}

/**
 * Archive a lead (never delete). Only allowed from 'new'/'assigned'.
 * RLS restricts UPDATE to admins.
 */
export async function archiveLead(
  leadId: string
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  if (!leadId) return { ok: false, error: "Lead saknas" };

  const { error } = await guard.supabase
    .from("lead_inbox")
    .update({ status: "archived" })
    .eq("id", leadId)
    .in("status", ["new", "assigned"]);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/leads");
  return { ok: true };
}

export interface DuplicateCustomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Find existing customers that match the lead's email OR phone, for the
 * duplicate warning shown before assigning. Session client + admin RLS.
 */
export async function findDuplicateCustomers(
  email: string | null,
  phone: string | null
): Promise<{ ok: boolean; matches: DuplicateCustomer[]; error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, matches: [], error: guard.error };

  const cleanEmail = (email ?? "").trim();
  const cleanPhone = (phone ?? "").trim();

  if (!cleanEmail && !cleanPhone) {
    return { ok: true, matches: [] };
  }

  const orParts: string[] = [];
  if (cleanEmail) orParts.push(`email.eq.${cleanEmail}`);
  if (cleanPhone) orParts.push(`phone.eq.${cleanPhone}`);

  const { data, error } = await guard.supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone")
    .or(orParts.join(","));

  if (error) {
    return { ok: false, matches: [], error: error.message };
  }

  return { ok: true, matches: (data ?? []) as DuplicateCustomer[] };
}
