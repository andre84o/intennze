"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

/**
 * Fakturering — Commission-aware server actions.
 *
 * SECURITY MODEL
 * --------------
 * The admin layout only checks that a user is logged in — it does NOT check the
 * role. Every exported action here independently re-verifies, server-side, that
 * the caller is an active admin via requireAdmin() before touching any data.
 * Never trust the client, the layout, or a previous action.
 *
 * These actions run as the logged-in user (SESSION client, RLS applies). No
 * service-role client is used here. The money/commission side effects live
 * entirely in the SECURITY DEFINER RPC confirm_invoice_paid on the DB — this
 * layer only authorizes the caller and forwards validated input.
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

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ---------------------------------------------------------------------------
// getEligibleSalespeople — ADMIN ONLY (never exposed to staff)
// ---------------------------------------------------------------------------

export interface EligibleSalesperson {
  userId: string;
  name: string;
}

export interface EligibleSalespeopleResult {
  ok: boolean;
  salespeople: EligibleSalesperson[];
  error?: string;
}

/**
 * List active, commission-eligible profiles for the salesperson dropdown in the
 * "confirm paid" dialog. Admin-only. Uses the SESSION client (RLS: admins can
 * read all profiles).
 */
export async function getEligibleSalespeople(): Promise<EligibleSalespeopleResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, salespeople: [], error: guard.error };

  const { data, error } = await guard.supabase
    .from("profiles")
    .select("user_id, first_name, last_name, email")
    .eq("commission_eligible", true)
    .eq("is_active", true)
    .eq("account_status", "active")
    .order("first_name", { ascending: true });

  if (error) {
    return { ok: false, salespeople: [], error: error.message };
  }

  const salespeople: EligibleSalesperson[] = (data ?? []).map((p) => {
    const first = (p.first_name ?? "").trim();
    const last = (p.last_name ?? "").trim();
    const name = `${first} ${last}`.trim() || (p.email ?? "Okänd");
    return { userId: p.user_id as string, name };
  });

  return { ok: true, salespeople };
}

// ---------------------------------------------------------------------------
// confirmInvoicePaid — ADMIN ONLY
// ---------------------------------------------------------------------------

export interface ConfirmInvoicePaidInput {
  invoiceId: string;
  /** Optional override of the salesperson credited for commission. */
  salespersonUserId?: string | null;
}

export interface ConfirmInvoicePaidResult {
  ok: boolean;
  error?: string;
  // Fields forwarded from the confirm_invoice_paid RPC (typed manually — the
  // RPC result is NOT in database.ts):
  invoiceNumber?: number | null;
  status?: string | null;
  period?: string | null;
  commissionCreated?: boolean;
  eligible?: boolean;
  reason?: string | null;
}

type ConfirmInvoicePaidRpc = {
  invoice: unknown;
  invoice_number: number | null;
  status: string | null;
  period: string | null;
  commission_created: boolean;
  eligible: boolean;
  reason: string | null;
};

/**
 * Mark an invoice as PAID via the SECURITY DEFINER RPC confirm_invoice_paid.
 * This is the ONLY path that creates a commission entry. The RPC performs all
 * money logic, eligibility checks, and the 'paid' transition atomically.
 *
 * The optional salespersonUserId lets the admin override the credited seller
 * (default is decided by the RPC from customers.owner_user_id when null).
 */
export async function confirmInvoicePaid(
  input: ConfirmInvoicePaidInput
): Promise<ConfirmInvoicePaidResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  if (!isUuid(input?.invoiceId)) {
    return { ok: false, error: "Ogiltig faktura" };
  }

  const salespersonUserId =
    input.salespersonUserId == null || input.salespersonUserId === ""
      ? null
      : input.salespersonUserId;

  if (salespersonUserId !== null && !isUuid(salespersonUserId)) {
    return { ok: false, error: "Ogiltig säljare" };
  }

  const { data, error } = await guard.supabase.rpc("confirm_invoice_paid", {
    p_invoice_id: input.invoiceId,
    p_salesperson_user_id: salespersonUserId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const rpc = (data ?? {}) as Partial<ConfirmInvoicePaidRpc>;

  revalidatePath("/admin/fakturering");
  revalidatePath("/admin/sales");

  return {
    ok: true,
    invoiceNumber: rpc.invoice_number ?? null,
    status: rpc.status ?? null,
    period: rpc.period ?? null,
    commissionCreated: rpc.commission_created === true,
    eligible: rpc.eligible === true,
    reason: rpc.reason ?? null,
  };
}
