"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

/**
 * Provision (Commission) — server actions.
 *
 * SECURITY MODEL
 * --------------
 * Two classes of action:
 *   1. STAFF-CALLABLE (getMyCommissionSummary / getMyCommissionBreakdown):
 *      scoped to auth.uid(). They NEVER accept another user's id — the caller
 *      can only ever see their own figures. RLS is the real guard; these read
 *      via the SESSION client so RLS applies.
 *   2. ADMIN-ONLY (company overview, per-seller list, approve/pay, adjustments,
 *      invoice backing): each re-verifies an active admin via requireAdmin()
 *      before touching data, mirroring src/app/admin/staff/actions.ts.
 *
 * Money comes from the *_snapshot columns of commission_periods, or, for the
 * current/open month where no snapshot has been frozen yet, from the
 * get_commission_period_figures RPC. All amounts are numeric KRONOR (may carry
 * öre). No service-role usage here; no hardcoded user IDs.
 *
 * RPC results are typed MANUALLY here — they are NOT in database.ts.
 */

// ---------------------------------------------------------------------------
// Shared helpers / guards
// ---------------------------------------------------------------------------

type SessionOk = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };
type SessionFail = { error: string };

/** Ensure a logged-in user; return the SESSION client + uid. No role check. */
async function requireUser(): Promise<SessionOk | SessionFail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };
  return { supabase, userId: user.id };
}

/** Ensure an ACTIVE ADMIN; return the SESSION client + uid. */
async function requireAdmin(): Promise<SessionOk | SessionFail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

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

/** "YYYY-MM" -> "YYYY-MM-01"; returns null if the month is malformed. */
function monthToPeriodStart(month: unknown): string | null {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  return `${month}-01`;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const ADJUSTMENT_TYPES = ["refund", "credit", "correction", "bonus", "other"] as const;
type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];
const ADJUSTMENT_TYPE_SET = new Set<string>(ADJUSTMENT_TYPES);

type PeriodStatus = "open" | "approved" | "paid";

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export interface CommissionFigures {
  /** Whether a real period row exists yet for this month. */
  periodExists: boolean;
  periodId: string | null;
  status: PeriodStatus;
  /** True if figures are computed live (open month, no frozen snapshot). */
  dynamic: boolean;
  revenueExVat: number;
  tierRatePercent: number | null;
  earnedCommission: number;
  adjustments: number;
  finalCommission: number;
  /** Portion already paid out (paid periods) — else 0. */
  paidCommission: number;
  /** finalCommission - paidCommission. */
  unpaidCommission: number;
  /** next tier min − revenue; null at top tier / unknown. */
  kvarTillNastaNiva: number | null;
}

/** Snapshot columns we read from commission_periods. */
const PERIOD_SNAPSHOT_COLUMNS =
  "id, user_id, period_start, status, revenue_ex_vat_snapshot, tier_rate_percent_snapshot, earned_commission_snapshot, adjustments_snapshot, final_commission_snapshot, paid_at" as const;

type PeriodRow = {
  id: string;
  user_id: string;
  period_start: string;
  status: string | null;
  revenue_ex_vat_snapshot: number | string | null;
  tier_rate_percent_snapshot: number | string | null;
  earned_commission_snapshot: number | string | null;
  adjustments_snapshot: number | string | null;
  final_commission_snapshot: number | string | null;
  paid_at: string | null;
};

type PeriodFiguresRpc = {
  period: string | null;
  user_id: string | null;
  period_start: string | null;
  status: string | null;
  dynamic: boolean | null;
  revenue_ex_vat: number | string | null;
  tier_rate_percent: number | string | null;
  earned_commission: number | string | null;
  adjustments: number | string | null;
  final_commission: number | string | null;
};

/**
 * "Kvar till nästa nivå" = next active tier's min_revenue_ex_vat − revenue.
 * Computed SERVER-SIDE from commission_tiers. Returns null at the top tier
 * (no higher tier) or when tiers can't be read.
 */
async function computeKvarTillNastaNiva(
  supabase: Awaited<ReturnType<typeof createClient>>,
  revenue: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from("commission_tiers")
    .select("min_revenue_ex_vat, effective_to")
    .is("effective_to", null)
    .order("min_revenue_ex_vat", { ascending: true });

  if (error || !data) return null;

  const mins = data
    .map((t) => num((t as { min_revenue_ex_vat: number | string | null }).min_revenue_ex_vat))
    .filter((m) => Number.isFinite(m))
    .sort((a, b) => a - b);

  // First tier boundary strictly greater than current revenue is the next level.
  const next = mins.find((m) => m > revenue);
  if (next === undefined) return null; // already at (or above) the top tier
  return next - revenue;
}

/** Normalise a period status string to the allowlist. */
function normStatus(s: string | null | undefined): PeriodStatus {
  return s === "approved" || s === "paid" ? s : "open";
}

/**
 * Resolve commission figures for a single user + month.
 * Prefers the frozen *_snapshot columns (approved/paid periods). For an open
 * month with no usable snapshot, falls back to get_commission_period_figures.
 */
async function resolveFigures(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  periodStart: string
): Promise<CommissionFigures> {
  const { data: periodRow } = await supabase
    .from("commission_periods")
    .select(PERIOD_SNAPSHOT_COLUMNS)
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle<PeriodRow>();

  const empty: CommissionFigures = {
    periodExists: false,
    periodId: null,
    status: "open",
    dynamic: true,
    revenueExVat: 0,
    tierRatePercent: null,
    earnedCommission: 0,
    adjustments: 0,
    finalCommission: 0,
    paidCommission: 0,
    unpaidCommission: 0,
    kvarTillNastaNiva: null,
  };

  if (!periodRow) {
    // No period row yet — try the live RPC so an open month still shows figures.
    const live = await tryLiveFigures(supabase, userId, periodStart);
    if (live) return live;
    // No period + no live figures → show zeros, never error.
    empty.kvarTillNastaNiva = await computeKvarTillNastaNiva(supabase, 0);
    return empty;
  }

  const status = normStatus(periodRow.status);
  const hasSnapshot = periodRow.final_commission_snapshot != null;

  // Open month without a frozen snapshot → compute live.
  if (status === "open" && !hasSnapshot) {
    const live = await tryLiveFigures(supabase, userId, periodStart, periodRow.id);
    if (live) return live;
  }

  const revenue = num(periodRow.revenue_ex_vat_snapshot);
  const earned = num(periodRow.earned_commission_snapshot);
  const adjustments = num(periodRow.adjustments_snapshot);
  const final = num(periodRow.final_commission_snapshot);
  const paidCommission = status === "paid" ? final : 0;

  return {
    periodExists: true,
    periodId: periodRow.id,
    status,
    dynamic: false,
    revenueExVat: revenue,
    tierRatePercent:
      periodRow.tier_rate_percent_snapshot == null
        ? null
        : num(periodRow.tier_rate_percent_snapshot),
    earnedCommission: earned,
    adjustments,
    finalCommission: final,
    paidCommission,
    unpaidCommission: final - paidCommission,
    kvarTillNastaNiva: await computeKvarTillNastaNiva(supabase, revenue),
  };
}

/** Try get_commission_period_figures; returns null if unavailable/errored. */
async function tryLiveFigures(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  periodStart: string,
  periodId?: string
): Promise<CommissionFigures | null> {
  if (!periodId) {
    // The RPC keys off a period id; without a row we can't call it.
    return null;
  }
  const { data, error } = await supabase.rpc("get_commission_period_figures", {
    p_period_id: periodId,
  });
  if (error || !data) return null;

  const f = data as Partial<PeriodFiguresRpc>;
  const revenue = num(f.revenue_ex_vat);
  const final = num(f.final_commission);
  const status = normStatus(f.status);

  return {
    periodExists: true,
    periodId,
    status,
    dynamic: f.dynamic === true,
    revenueExVat: revenue,
    tierRatePercent: f.tier_rate_percent == null ? null : num(f.tier_rate_percent),
    earnedCommission: num(f.earned_commission),
    adjustments: num(f.adjustments),
    finalCommission: final,
    paidCommission: status === "paid" ? final : 0,
    unpaidCommission: final - (status === "paid" ? final : 0),
    kvarTillNastaNiva: await computeKvarTillNastaNiva(supabase, revenue),
  };
}

// ---------------------------------------------------------------------------
// 1. getMyCommissionSummary(month) — STAFF-CALLABLE, scoped to auth.uid()
// ---------------------------------------------------------------------------

export interface MyCommissionSummaryResult {
  ok: boolean;
  error?: string;
  month?: string;
  figures?: CommissionFigures;
}

export async function getMyCommissionSummary(
  month: string
): Promise<MyCommissionSummaryResult> {
  const guard = await requireUser();
  if ("error" in guard) return { ok: false, error: guard.error };

  const periodStart = monthToPeriodStart(month);
  if (!periodStart) return { ok: false, error: "Ogiltig månad" };

  // SCOPED TO SELF: always guard.userId, never a client-provided id.
  const figures = await resolveFigures(guard.supabase, guard.userId, periodStart);
  return { ok: true, month, figures };
}

// ---------------------------------------------------------------------------
// 2. getMyCommissionBreakdown(month) — STAFF-CALLABLE, scoped to auth.uid()
// ---------------------------------------------------------------------------

export interface CommissionEntryItem {
  invoiceId: string;
  invoiceNumber: number | null;
  paidAt: string | null;
  amountExVat: number;
  vatAmount: number;
  total: number;
  customerId: string | null;
}

export interface CommissionAdjustmentItem {
  amount: number;
  reason: string | null;
  adjustmentType: string | null;
  sourceInvoiceId: string | null;
  sourceCreditInvoiceId: string | null;
  createdAt: string | null;
}

export interface MyCommissionBreakdownResult {
  ok: boolean;
  error?: string;
  month?: string;
  entries?: CommissionEntryItem[];
  adjustments?: CommissionAdjustmentItem[];
}

export async function getMyCommissionBreakdown(
  month: string
): Promise<MyCommissionBreakdownResult> {
  const guard = await requireUser();
  if ("error" in guard) return { ok: false, error: guard.error };

  const periodStart = monthToPeriodStart(month);
  if (!periodStart) return { ok: false, error: "Ogiltig månad" };

  // SCOPED TO SELF.
  const entries = await fetchEntries(guard.supabase, guard.userId, periodStart);
  const adjustments = await fetchAdjustments(guard.supabase, guard.userId, periodStart);
  return { ok: true, month, entries, adjustments };
}

async function fetchEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  periodStart: string
): Promise<CommissionEntryItem[]> {
  const { data } = await supabase
    .from("commission_entries")
    .select(
      "invoice_id, invoice_number_snapshot, paid_at_snapshot, amount_ex_vat_snapshot, vat_amount_snapshot, total_snapshot, customer_id"
    )
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .order("paid_at_snapshot", { ascending: true });

  return (data ?? []).map((e) => {
    const row = e as {
      invoice_id: string;
      invoice_number_snapshot: number | null;
      paid_at_snapshot: string | null;
      amount_ex_vat_snapshot: number | string | null;
      vat_amount_snapshot: number | string | null;
      total_snapshot: number | string | null;
      customer_id: string | null;
    };
    return {
      invoiceId: row.invoice_id,
      invoiceNumber: row.invoice_number_snapshot ?? null,
      paidAt: row.paid_at_snapshot ?? null,
      amountExVat: num(row.amount_ex_vat_snapshot),
      vatAmount: num(row.vat_amount_snapshot),
      total: num(row.total_snapshot),
      customerId: row.customer_id ?? null,
    };
  });
}

async function fetchAdjustments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  periodStart: string
): Promise<CommissionAdjustmentItem[]> {
  // Adjustments hang off the period row; resolve the id for this month.
  const { data: period } = await supabase
    .from("commission_periods")
    .select("id")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle<{ id: string }>();

  if (!period) return [];

  const { data } = await supabase
    .from("commission_adjustments")
    .select(
      "amount, reason, adjustment_type, source_invoice_id, source_credit_invoice_id, created_at"
    )
    .eq("user_id", userId)
    .eq("period_id", period.id)
    .order("created_at", { ascending: true });

  return (data ?? []).map((a) => {
    const row = a as {
      amount: number | string | null;
      reason: string | null;
      adjustment_type: string | null;
      source_invoice_id: string | null;
      source_credit_invoice_id: string | null;
      created_at: string | null;
    };
    return {
      amount: num(row.amount),
      reason: row.reason ?? null,
      adjustmentType: row.adjustment_type ?? null,
      sourceInvoiceId: row.source_invoice_id ?? null,
      sourceCreditInvoiceId: row.source_credit_invoice_id ?? null,
      createdAt: row.created_at ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. getCompanyCommissionOverview(month) — ADMIN ONLY
// ---------------------------------------------------------------------------

export interface CompanyCommissionOverviewResult {
  ok: boolean;
  error?: string;
  month?: string;
  totalRevenueExVat?: number;
  totalEarnedCommission?: number;
  totalFinalCommission?: number;
  totalPaidCommission?: number;
  totalUnpaidCommission?: number;
  sellerCount?: number;
}

export async function getCompanyCommissionOverview(
  month: string
): Promise<CompanyCommissionOverviewResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  const periodStart = monthToPeriodStart(month);
  if (!periodStart) return { ok: false, error: "Ogiltig månad" };

  const { data, error } = await guard.supabase
    .from("commission_periods")
    .select(
      "user_id, status, revenue_ex_vat_snapshot, earned_commission_snapshot, final_commission_snapshot"
    )
    .eq("period_start", periodStart);

  if (error) return { ok: false, error: error.message };

  const rows = data ?? [];
  let totalRevenue = 0;
  let totalEarned = 0;
  let totalFinal = 0;
  let totalPaid = 0;
  const sellers = new Set<string>();

  for (const r of rows) {
    const row = r as {
      user_id: string;
      status: string | null;
      revenue_ex_vat_snapshot: number | string | null;
      earned_commission_snapshot: number | string | null;
      final_commission_snapshot: number | string | null;
    };
    sellers.add(row.user_id);
    totalRevenue += num(row.revenue_ex_vat_snapshot);
    totalEarned += num(row.earned_commission_snapshot);
    const final = num(row.final_commission_snapshot);
    totalFinal += final;
    if (normStatus(row.status) === "paid") totalPaid += final;
  }

  return {
    ok: true,
    month,
    totalRevenueExVat: totalRevenue,
    totalEarnedCommission: totalEarned,
    totalFinalCommission: totalFinal,
    totalPaidCommission: totalPaid,
    totalUnpaidCommission: totalFinal - totalPaid,
    sellerCount: sellers.size,
  };
}

// ---------------------------------------------------------------------------
// 4. getSalespeopleCommission(month) — ADMIN ONLY
// ---------------------------------------------------------------------------

export interface SalespersonCommissionRow {
  userId: string;
  name: string;
  periodId: string | null;
  status: PeriodStatus;
  revenueExVat: number;
  tierRatePercent: number | null;
  earnedCommission: number;
  adjustments: number;
  finalCommission: number;
  paidCommission: number;
  unpaidCommission: number;
}

export interface SalespeopleCommissionResult {
  ok: boolean;
  error?: string;
  month?: string;
  rows?: SalespersonCommissionRow[];
}

export async function getSalespeopleCommission(
  month: string
): Promise<SalespeopleCommissionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  const periodStart = monthToPeriodStart(month);
  if (!periodStart) return { ok: false, error: "Ogiltig månad" };

  const { data: periods, error } = await guard.supabase
    .from("commission_periods")
    .select(PERIOD_SNAPSHOT_COLUMNS)
    .eq("period_start", periodStart);

  if (error) return { ok: false, error: error.message };

  const rows = (periods ?? []) as PeriodRow[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  // Resolve display names (SESSION client, RLS: admins read all profiles).
  const namesByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profs } = await guard.supabase
      .from("profiles")
      .select("user_id, first_name, last_name, email")
      .in("user_id", userIds);
    for (const p of profs ?? []) {
      const row = p as {
        user_id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      };
      const name =
        `${(row.first_name ?? "").trim()} ${(row.last_name ?? "").trim()}`.trim() ||
        (row.email ?? "Okänd");
      namesByUser.set(row.user_id, name);
    }
  }

  const result: SalespersonCommissionRow[] = rows.map((r) => {
    const status = normStatus(r.status);
    const final = num(r.final_commission_snapshot);
    const paid = status === "paid" ? final : 0;
    return {
      userId: r.user_id,
      name: namesByUser.get(r.user_id) ?? "Okänd",
      periodId: r.id,
      status,
      revenueExVat: num(r.revenue_ex_vat_snapshot),
      tierRatePercent:
        r.tier_rate_percent_snapshot == null ? null : num(r.tier_rate_percent_snapshot),
      earnedCommission: num(r.earned_commission_snapshot),
      adjustments: num(r.adjustments_snapshot),
      finalCommission: final,
      paidCommission: paid,
      unpaidCommission: final - paid,
    };
  });

  result.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  return { ok: true, month, rows: result };
}

// ---------------------------------------------------------------------------
// 5. approvePeriod(periodId) — ADMIN ONLY
// ---------------------------------------------------------------------------

export interface PeriodActionResult {
  ok: boolean;
  error?: string;
}

export async function approvePeriod(periodId: string): Promise<PeriodActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };
  if (!isUuid(periodId)) return { ok: false, error: "Ogiltig period" };

  const { error } = await guard.supabase.rpc("approve_commission_period", {
    p_period_id: periodId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sales");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 6. markPeriodPaid(periodId) — ADMIN ONLY
// ---------------------------------------------------------------------------

export async function markPeriodPaid(periodId: string): Promise<PeriodActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };
  if (!isUuid(periodId)) return { ok: false, error: "Ogiltig period" };

  const { error } = await guard.supabase.rpc("mark_commission_period_paid", {
    p_period_id: periodId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sales");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 7. createAdjustment(input) — ADMIN ONLY
// ---------------------------------------------------------------------------

export interface CreateAdjustmentInput {
  userId: string;
  periodId: string;
  amount: number;
  reason: string;
  adjustmentType: AdjustmentType;
  sourceInvoiceId?: string | null;
  sourceCreditInvoiceId?: string | null;
}

export async function createAdjustment(
  input: CreateAdjustmentInput
): Promise<PeriodActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  if (!isUuid(input?.userId)) return { ok: false, error: "Ogiltig användare" };
  if (!isUuid(input?.periodId)) return { ok: false, error: "Ogiltig period" };

  const amount = num(input?.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "Ogiltigt belopp" };
  }

  const reason = (input?.reason ?? "").trim();
  if (!reason) return { ok: false, error: "Ange en anledning" };

  if (!ADJUSTMENT_TYPE_SET.has(input?.adjustmentType)) {
    return { ok: false, error: "Ogiltig justeringstyp" };
  }

  const sourceInvoiceId =
    input.sourceInvoiceId == null || input.sourceInvoiceId === ""
      ? null
      : input.sourceInvoiceId;
  const sourceCreditInvoiceId =
    input.sourceCreditInvoiceId == null || input.sourceCreditInvoiceId === ""
      ? null
      : input.sourceCreditInvoiceId;

  if (sourceInvoiceId !== null && !isUuid(sourceInvoiceId)) {
    return { ok: false, error: "Ogiltig källfaktura" };
  }
  if (sourceCreditInvoiceId !== null && !isUuid(sourceCreditInvoiceId)) {
    return { ok: false, error: "Ogiltig kreditfaktura" };
  }

  const { error } = await guard.supabase.rpc("create_commission_adjustment", {
    p_user_id: input.userId,
    p_period_id: input.periodId,
    p_amount: amount,
    p_reason: reason,
    p_adjustment_type: input.adjustmentType,
    p_source_invoice_id: sourceInvoiceId,
    p_source_credit_invoice_id: sourceCreditInvoiceId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sales");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 8. getInvoiceBacking(periodId) — ADMIN ONLY
// ---------------------------------------------------------------------------

export interface InvoiceBackingResult {
  ok: boolean;
  error?: string;
  entries?: CommissionEntryItem[];
}

/**
 * Included invoices (commission_entries) backing a given period. Admin-only:
 * resolves the period's user + month, then reads that user's entries. Staff use
 * getMyCommissionBreakdown instead (scoped to self).
 */
export async function getInvoiceBacking(periodId: string): Promise<InvoiceBackingResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };
  if (!isUuid(periodId)) return { ok: false, error: "Ogiltig period" };

  const { data: period, error: perErr } = await guard.supabase
    .from("commission_periods")
    .select("user_id, period_start")
    .eq("id", periodId)
    .maybeSingle<{ user_id: string; period_start: string }>();

  if (perErr) return { ok: false, error: perErr.message };
  if (!period) return { ok: true, entries: [] };

  const entries = await fetchEntries(guard.supabase, period.user_id, period.period_start);
  return { ok: true, entries };
}

// ---------------------------------------------------------------------------
// Trend series (last N months) for the dashboard charts. Real, RLS-scoped:
//   scope "me"      -> the logged-in user's own entries (requireUser + RLS)
//   scope "company" -> all entries (requireAdmin). Commission is derived by
//   applying the active tier ladder to each month's revenue (same formula the
//   RPC uses), so the charts never trust client math on raw money.
// ---------------------------------------------------------------------------

export interface TrendPoint {
  month: string; // YYYY-MM
  revenue: number;
  commission: number;
}
export interface SalesTrendResult {
  ok: boolean;
  points?: TrendPoint[];
  error?: string;
}

export async function getSalesTrend(
  scope: "me" | "company",
  endMonth: string,
  months = 8
): Promise<SalesTrendResult> {
  const guard = scope === "company" ? await requireAdmin() : await requireUser();
  if ("error" in guard) return { ok: false, error: guard.error };

  const endStart = monthToPeriodStart(endMonth);
  if (!endStart) return { ok: false, error: "Ogiltig månad" };
  const span = Math.max(1, Math.min(24, Math.floor(months)));

  const [ey, em] = endMonth.split("-").map((v) => parseInt(v, 10));
  const buckets: string[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(ey, em - 1 - i, 1);
    buckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const startPeriod = `${buckets[0]}-01`;

  // Read the official per-month figures from commission_periods snapshots
  // (RLS: "me" -> own; "company" -> all for admin). Sum across sellers per month.
  let q = guard.supabase
    .from("commission_periods")
    .select("period_start, revenue_ex_vat_snapshot, final_commission_snapshot, user_id")
    .gte("period_start", startPeriod)
    .lte("period_start", endStart);
  if (scope === "me") q = q.eq("user_id", guard.userId);
  const { data: periods, error } = await q;
  if (error) return { ok: false, error: "Kunde inte hämta trend" };

  const revByMonth = new Map<string, number>();
  const commByMonth = new Map<string, number>();
  for (const p of periods ?? []) {
    const m = String((p as { period_start: string }).period_start).slice(0, 7);
    revByMonth.set(
      m,
      (revByMonth.get(m) ?? 0) + num((p as { revenue_ex_vat_snapshot: unknown }).revenue_ex_vat_snapshot)
    );
    commByMonth.set(
      m,
      (commByMonth.get(m) ?? 0) + num((p as { final_commission_snapshot: unknown }).final_commission_snapshot)
    );
  }

  const points: TrendPoint[] = buckets.map((m) => ({
    month: m,
    revenue: revByMonth.get(m) ?? 0,
    commission: commByMonth.get(m) ?? 0,
  }));

  return { ok: true, points };
}
