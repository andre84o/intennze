"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Staff Management v1 — server-only Admin actions.
 *
 * SECURITY MODEL
 * --------------
 * The admin layout (src/app/admin/layout.tsx) only checks that a user is
 * logged in — it does NOT check the role. Therefore EVERY exported action here
 * independently re-verifies, server-side, that the caller is an active admin
 * via requireAdmin() before touching any data. Never trust the client, the
 * layout, or a previous action.
 *
 * TWO CLIENTS
 * -----------
 * 1. SESSION client (`createClient` from @/utils/supabase/server): runs as the
 *    logged-in user. RLS applies. profiles_write = is_admin(), so an admin JWT
 *    can INSERT/UPDATE profiles, and the AFTER-INSERT/UPDATE audit trigger
 *    attributes the change to the acting admin (auth.uid()). We use this for
 *    all profile writes.
 * 2. SERVICE-ROLE client (`createServiceClient`, SERVER ONLY): bypasses RLS.
 *    Used only for auth admin operations (invite/delete user) and for reading
 *    auth.users metadata (email / last_sign_in_at). The service-role key and
 *    this client MUST NEVER be returned to or reach the client.
 *
 * The set_user_permissions RPC (SECURITY DEFINER, admin-checked, atomic,
 * allowlist-validated) is called via the SESSION client so its internal admin
 * check sees the acting admin.
 *
 * The protect_profiles DB trigger enforces last-active-admin + self-role rules
 * at the database layer — it is the real guard. The pre-checks / validation
 * here are defense-in-depth; we surface the trigger's error message cleanly.
 */

// Only valid permission values. Any permission outside this list is rejected.
const CANONICAL_PERMISSIONS = [
  "crm.access",
  "customers.view_own",
  "customers.create",
  "customers.update_own",
  "quotes.view_own",
  "quotes.create",
  "quotes.update_own",
  "emails.send",
  "reminders.manage_own",
  "attachments.upload",
] as const;

const CANONICAL_PERMISSION_SET = new Set<string>(CANONICAL_PERMISSIONS);

const VALID_ROLES = new Set(["admin", "staff"]);
const VALID_STATUSES = new Set(["active", "suspended", "ended"]);

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

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

/**
 * Build the SERVICE-ROLE client. SERVER ONLY. Never expose this or the key.
 * Throws if env is missing so we fail loudly rather than silently mis-behave.
 */
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service-role är inte konfigurerad på servern");
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Resolve the public app URL used for the invite redirect. Prefers the
 * configured NEXT_PUBLIC_SITE_URL, then the request's forwarded host, then a
 * safe production fallback. Never hardcodes an admin identity.
 */
async function resolveAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? "https";
      return `${proto}://${host}`;
    }
  } catch {
    // headers() unavailable in this context — fall through to default.
  }

  return "https://www.intenzze.com";
}

function normalizePermissions(permissions: string[]): { ok: true; perms: string[] } | { ok: false; error: string } {
  if (!Array.isArray(permissions)) {
    return { ok: false, error: "Behörigheter saknas" };
  }
  const perms = Array.from(new Set(permissions.map((p) => (p ?? "").trim()))).filter(Boolean);
  for (const p of perms) {
    if (!CANONICAL_PERMISSION_SET.has(p)) {
      return { ok: false, error: `Ogiltig behörighet: ${p}` };
    }
  }
  return { ok: true, perms };
}

// ---------------------------------------------------------------------------
// 1. inviteStaff
// ---------------------------------------------------------------------------

export interface InviteStaffInput {
  email: string;
  role: "admin" | "staff";
  firstName: string;
  lastName: string;
  phone?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  jobTitle?: string;
  employmentStart?: string;
  commissionEligible: boolean;
  permissions: string[];
}

export interface InviteStaffResult {
  ok: boolean;
  userId?: string;
  error?: string;
}

/**
 * Invite a new staff/admin member.
 *
 * Flow:
 *  1. requireAdmin (independent re-check) — capture session client + admin id.
 *  2. Validate input (email format, role allowlist, name, permission allowlist).
 *  3. SERVICE-ROLE: inviteUserByEmail → creates the auth user + sends invite.
 *  4. SESSION client INSERT into profiles → auth.uid()=admin so the audit
 *     trigger logs 'staff.invited' attributed to the acting admin.
 *  5. RPC set_user_permissions (atomic, allowlist-validated on the server).
 *
 * COMPENSATION: The auth user is created first (step 3). If ANY later step
 * (profile insert or permissions) fails, we attempt to delete the just-created
 * auth user (admin.auth.admin.deleteUser) so we never leave an orphaned auth
 * account with no profile. The compensation itself is best-effort; either way
 * we return a clear error.
 */
export async function inviteStaff(input: InviteStaffInput): Promise<InviteStaffResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  // --- validation ---------------------------------------------------------
  const email = (input?.email ?? "").trim().toLowerCase();
  const role = input?.role;
  const firstName = (input?.firstName ?? "").trim();
  const lastName = (input?.lastName ?? "").trim();

  if (!isEmail(email)) return { ok: false, error: "Ogiltig e-postadress" };
  if (!role || !VALID_ROLES.has(role)) return { ok: false, error: "Ogiltig roll" };
  if (!firstName) return { ok: false, error: "Förnamn krävs" };

  const permCheck = normalizePermissions(input?.permissions ?? []);
  if (!permCheck.ok) return { ok: false, error: permCheck.error };
  const permissions = permCheck.perms;

  let admin: ReturnType<typeof serviceClient>;
  try {
    admin = serviceClient();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Serverfel" };
  }

  // --- 3. create auth user + send invite ----------------------------------
  const appUrl = await resolveAppUrl();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/accept-invite`,
  });

  if (inviteError || !invited?.user?.id) {
    return { ok: false, error: inviteError?.message ?? "Kunde inte skicka inbjudan" };
  }

  const newId = invited.user.id;

  // Ordered compensation for a partially-completed invite. Rolls back ONLY the
  // just-created user (newId) — NEVER any existing staff. Order (required):
  //   1) delete user_permissions  2) delete the profiles row (session/admin
  //      context)  3) delete the Auth user (service role).
  // profiles has an ON DELETE RESTRICT FK to auth.users, so the profile row and
  // its permissions MUST be removed before the auth user. Returns a clear note
  // when cleanup only partially succeeds so the caller can surface it.
  const compensate = async (profileCreated: boolean): Promise<string | null> => {
    const failures: string[] = [];

    if (profileCreated) {
      const { error: permDelErr } = await guard.supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", newId);
      if (permDelErr) failures.push(`user_permissions (${permDelErr.message})`);

      const { error: profDelErr } = await guard.supabase
        .from("profiles")
        .delete()
        .eq("user_id", newId);
      if (profDelErr) failures.push(`profiles row (${profDelErr.message})`);
    }

    try {
      const { error: authDelErr } = await admin.auth.admin.deleteUser(newId);
      if (authDelErr) failures.push(`auth user (${authDelErr.message})`);
    } catch (e) {
      failures.push(`auth user (${e instanceof Error ? e.message : "unknown error"})`);
    }

    if (failures.length === 0) return null;
    const note =
      `Cleanup incomplete — manual removal required for user ${newId}: ` +
      failures.join("; ");
    console.error("[staff.invite]", note);
    return note;
  };

  // --- 4. insert profile via SESSION client (audit → 'staff.invited') -----
  const { error: profileError } = await guard.supabase.from("profiles").insert({
    user_id: newId,
    role,
    first_name: firstName,
    last_name: lastName || null,
    email,
    phone: (input.phone ?? "").trim() || null,
    address_line: (input.addressLine ?? "").trim() || null,
    postal_code: (input.postalCode ?? "").trim() || null,
    city: (input.city ?? "").trim() || null,
    country: (input.country ?? "").trim() || null,
    job_title: (input.jobTitle ?? "").trim() || null,
    employment_start: (input.employmentStart ?? "").trim() || null,
    commission_eligible: input.commissionEligible === true,
    account_status: "active",
    is_active: true,
    created_by: guard.userId,
  });

  if (profileError) {
    // profile was NOT created -> only the auth user needs removing.
    const cleanupNote = await compensate(false);
    return {
      ok: false,
      error: profileError.message + (cleanupNote ? ` — ${cleanupNote}` : ""),
    };
  }

  // --- 5. permissions (atomic RPC) ----------------------------------------
  const { error: permError } = await guard.supabase.rpc("set_user_permissions", {
    p_user: newId,
    p_perms: permissions,
  });

  if (permError) {
    // profile WAS created -> remove permissions, then profile, then auth user.
    const cleanupNote = await compensate(true);
    return {
      ok: false,
      error: permError.message + (cleanupNote ? ` — ${cleanupNote}` : ""),
    };
  }

  revalidatePath("/admin/staff");
  return { ok: true, userId: newId };
}

// ---------------------------------------------------------------------------
// 2. updateStaff
// ---------------------------------------------------------------------------

export interface UpdateStaffFields {
  firstName?: string;
  lastName?: string;
  phone?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  jobTitle?: string;
  employmentStart?: string;
  employmentEnd?: string;
  commissionEligible?: boolean;
  role?: "admin" | "staff";
}

/**
 * Update an existing staff member's profile via the SESSION client (RLS +
 * audit apply). email is READ-ONLY in v1 and is never updated here.
 *
 * The protect_profiles DB trigger enforces the last-active-admin and self-role
 * rules; if it rejects the change we surface its message cleanly.
 */
export async function updateStaff(
  userId: string,
  fields: UpdateStaffFields
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  if (!userId) return { ok: false, error: "Användare saknas" };

  const update: Record<string, unknown> = {};

  const setText = (key: string, val: string | undefined) => {
    if (val !== undefined) update[key] = val.trim() || null;
  };

  setText("first_name", fields.firstName);
  setText("last_name", fields.lastName);
  setText("phone", fields.phone);
  setText("address_line", fields.addressLine);
  setText("postal_code", fields.postalCode);
  setText("city", fields.city);
  setText("country", fields.country);
  setText("job_title", fields.jobTitle);
  setText("employment_start", fields.employmentStart);
  setText("employment_end", fields.employmentEnd);

  if (fields.commissionEligible !== undefined) {
    update.commission_eligible = fields.commissionEligible === true;
  }

  if (fields.role !== undefined) {
    if (!VALID_ROLES.has(fields.role)) return { ok: false, error: "Ogiltig roll" };
    update.role = fields.role;
  }

  // Never allow email to be updated in v1.
  // (No 'email' key is ever placed in `update`.)

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Inga ändringar" };
  }

  const { error } = await guard.supabase
    .from("profiles")
    .update(update)
    .eq("user_id", userId);

  if (error) {
    // Surfaces protect_profiles trigger errors (last admin / self-role) cleanly.
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 3. setStaffStatus
// ---------------------------------------------------------------------------

/**
 * Change a staff member's account_status. is_active is kept true — the
 * is_active_profile gate already keys off account_status. The protect_profiles
 * trigger blocks suspending/ending the last active admin.
 */
export async function setStaffStatus(
  userId: string,
  status: "active" | "suspended" | "ended"
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  if (!userId) return { ok: false, error: "Användare saknas" };
  if (!VALID_STATUSES.has(status)) return { ok: false, error: "Ogiltig status" };

  const { error } = await guard.supabase
    .from("profiles")
    .update({ account_status: status, is_active: true })
    .eq("user_id", userId);

  if (error) {
    // Surfaces protect_profiles trigger errors (last active admin) cleanly.
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 4. replaceStaffPermissions
// ---------------------------------------------------------------------------

/**
 * Atomically replace a staff member's permission set. Validates against the
 * canonical allowlist first (defense-in-depth), then delegates to the
 * SECURITY DEFINER RPC set_user_permissions which re-validates + re-checks
 * admin + applies atomically.
 */
export async function replaceStaffPermissions(
  userId: string,
  permissions: string[]
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };

  if (!userId) return { ok: false, error: "Användare saknas" };

  const permCheck = normalizePermissions(permissions);
  if (!permCheck.ok) return { ok: false, error: permCheck.error };

  const { error } = await guard.supabase.rpc("set_user_permissions", {
    p_user: userId,
    p_perms: permCheck.perms,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 5. listStaff
// ---------------------------------------------------------------------------

export interface StaffListItem {
  user_id: string;
  role: string | null;
  is_active: boolean | null;
  commission_eligible: boolean | null;
  must_change_password: boolean | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  employment_start: string | null;
  employment_end: string | null;
  account_status: string | null;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  job_title: string | null;
  created_by: string | null;
  // Derived from auth.users (service-role read):
  auth_email: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  // Derived UI state: "invited" (never signed in) vs "active".
  login_state: "invited" | "active";
  permissions: string[];
}

export interface ListStaffResult {
  ok: boolean;
  staff: StaffListItem[];
  error?: string;
}

/**
 * List all staff/admin profiles joined with auth.users metadata (email,
 * last_sign_in_at, email_confirmed_at) and their permission set.
 *
 * Admin-verified. Uses the SERVICE-ROLE client only to read auth.users
 * metadata (not available via the session client). The service-role client
 * never leaves the server; only plain data objects are returned.
 */
export async function listStaff(): Promise<ListStaffResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, staff: [], error: guard.error };

  // Profiles via the SESSION client (RLS: admins can read all profiles).
  const { data: profiles, error: profErr } = await guard.supabase
    .from("profiles")
    .select(
      "user_id, role, is_active, commission_eligible, must_change_password, first_name, last_name, email, phone, employment_start, employment_end, account_status, address_line, postal_code, city, country, job_title, created_by"
    )
    .order("first_name", { ascending: true });

  if (profErr) {
    return { ok: false, staff: [], error: profErr.message };
  }

  const rows = profiles ?? [];
  const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];

  // Permissions per user (SESSION client, RLS: admins can read all).
  const permsByUser = new Map<string, string[]>();
  if (userIds.length > 0) {
    const { data: permRows, error: permErr } = await guard.supabase
      .from("user_permissions")
      .select("user_id, permission")
      .in("user_id", userIds);

    if (permErr) {
      return { ok: false, staff: [], error: permErr.message };
    }
    for (const pr of permRows ?? []) {
      const uid = (pr as { user_id: string }).user_id;
      const perm = (pr as { permission: string }).permission;
      const list = permsByUser.get(uid) ?? [];
      list.push(perm);
      permsByUser.set(uid, list);
    }
  }

  // auth.users metadata via SERVICE-ROLE (server-only).
  const authByUser = new Map<
    string,
    { email: string | null; last_sign_in_at: string | null; email_confirmed_at: string | null }
  >();

  try {
    const admin = serviceClient();
    // listUsers is paginated; page through until we've covered everyone.
    let page = 1;
    const perPage = 1000;
    // Guard against runaway loops.
    for (let i = 0; i < 100; i++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[staff.list] listUsers failed:", error);
        break;
      }
      const users = data?.users ?? [];
      for (const u of users) {
        authByUser.set(u.id, {
          email: u.email ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed_at: (u as { email_confirmed_at?: string | null }).email_confirmed_at ?? null,
        });
      }
      if (users.length < perPage) break;
      page += 1;
    }
  } catch (e) {
    // Missing service-role config or transient failure — degrade gracefully:
    // return profiles without the auth-derived fields rather than erroring out.
    console.error("[staff.list] auth metadata unavailable:", e);
  }

  const staff: StaffListItem[] = rows.map((r) => {
    const auth = authByUser.get(r.user_id as string);
    const lastSignIn = auth?.last_sign_in_at ?? null;
    return {
      user_id: r.user_id,
      role: r.role,
      is_active: r.is_active,
      commission_eligible: r.commission_eligible,
      must_change_password: r.must_change_password,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      phone: r.phone,
      employment_start: r.employment_start,
      employment_end: r.employment_end,
      account_status: r.account_status,
      address_line: r.address_line,
      postal_code: r.postal_code,
      city: r.city,
      country: r.country,
      job_title: r.job_title,
      created_by: r.created_by,
      auth_email: auth?.email ?? null,
      last_sign_in_at: lastSignIn,
      email_confirmed_at: auth?.email_confirmed_at ?? null,
      // Never signed in → still "Invited"; otherwise "Active".
      login_state: lastSignIn ? "active" : "invited",
      permissions: permsByUser.get(r.user_id as string) ?? [],
    };
  });

  return { ok: true, staff };
}

// ---------------------------------------------------------------------------
// Per-salesperson commission ladder + base salary (ADMIN ONLY)
//   Reads/writes the admin-only tables (salesperson_commission_tiers +
//   salesperson_commission_settings) via the SESSION client, so the admin-only
//   RLS is the real guard; requireAdmin() is defense-in-depth. Base salary is
//   stored here for admin reference only and is never returned to salespeople.
// ---------------------------------------------------------------------------

export interface CommissionTierInput {
  minRevenueExVat: number;
  maxRevenueExVat: number | null;
  ratePercent: number;
}

export interface SalespersonCommissionConfig {
  tiers: CommissionTierInput[];
  baseSalary: number | null;
}

export interface GetCommissionConfigResult {
  ok: boolean;
  error?: string;
  config?: SalespersonCommissionConfig;
}

/** Default ladder pre-filled for a salesperson who has none yet. Mirrors the
 * business's starting ladder (editable per person in the Staff modal). */
const DEFAULT_COMMISSION_TIERS: CommissionTierInput[] = [
  { minRevenueExVat: 0, maxRevenueExVat: 50000, ratePercent: 15 },
  { minRevenueExVat: 50001, maxRevenueExVat: 100000, ratePercent: 20 },
  { minRevenueExVat: 100001, maxRevenueExVat: 150000, ratePercent: 25 },
  { minRevenueExVat: 150001, maxRevenueExVat: null, ratePercent: 30 },
];

export async function getSalespersonCommissionConfig(
  userId: string
): Promise<GetCommissionConfigResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };
  if (!isUuid(userId)) return { ok: false, error: "Ogiltig användare" };

  const { data: tierRows, error: tErr } = await guard.supabase
    .from("salesperson_commission_tiers")
    .select("min_revenue_ex_vat, max_revenue_ex_vat, rate_percent, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (tErr) return { ok: false, error: tErr.message };

  const { data: settingsRow } = await guard.supabase
    .from("salesperson_commission_settings")
    .select("base_salary")
    .eq("user_id", userId)
    .maybeSingle<{ base_salary: number | string | null }>();

  const tiers: CommissionTierInput[] =
    (tierRows ?? []).length > 0
      ? (tierRows ?? []).map((t) => {
          const row = t as {
            min_revenue_ex_vat: number | string | null;
            max_revenue_ex_vat: number | string | null;
            rate_percent: number | string | null;
          };
          return {
            minRevenueExVat: num(row.min_revenue_ex_vat),
            maxRevenueExVat: row.max_revenue_ex_vat == null ? null : num(row.max_revenue_ex_vat),
            ratePercent: num(row.rate_percent),
          };
        })
      : // No personal ladder yet → offer the default as an editable starting point.
        DEFAULT_COMMISSION_TIERS.map((t) => ({ ...t }));

  return {
    ok: true,
    config: {
      tiers,
      baseSalary: settingsRow?.base_salary == null ? null : num(settingsRow.base_salary),
    },
  };
}

export async function saveSalespersonCommissionConfig(
  userId: string,
  input: { tiers: CommissionTierInput[]; baseSalary: number | null }
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { ok: false, error: guard.error };
  if (!isUuid(userId)) return { ok: false, error: "Ogiltig användare" };

  const raw = Array.isArray(input?.tiers) ? input.tiers : [];
  const clean: { min: number; max: number | null; rate: number }[] = [];
  let prevMin = -1;
  for (const t of raw) {
    const min = num(t?.minRevenueExVat);
    const max =
      t?.maxRevenueExVat == null || (t.maxRevenueExVat as unknown) === "" ? null : num(t.maxRevenueExVat);
    const rate = num(t?.ratePercent);
    if (!(min >= 0)) return { ok: false, error: "Omsättningsgräns måste vara ≥ 0" };
    if (max != null && max < min) return { ok: false, error: "Max får inte vara mindre än min" };
    if (!(rate >= 0 && rate <= 100)) return { ok: false, error: "Provisionssats måste vara 0–100 %" };
    if (min <= prevMin) return { ok: false, error: "Omsättningsgränserna måste vara stigande" };
    prevMin = min;
    clean.push({ min, max, rate });
  }

  const base =
    input?.baseSalary == null || (input.baseSalary as unknown) === "" ? null : num(input.baseSalary);
  if (base != null && base < 0) return { ok: false, error: "Grundlön kan inte vara negativ" };

  // Replace the ladder atomically-ish: delete existing rows, then insert new.
  const del = await guard.supabase.from("salesperson_commission_tiers").delete().eq("user_id", userId);
  if (del.error) return { ok: false, error: del.error.message };
  if (clean.length > 0) {
    const rows = clean.map((t, i) => ({
      user_id: userId,
      sort_order: i + 1,
      min_revenue_ex_vat: t.min,
      max_revenue_ex_vat: t.max,
      rate_percent: t.rate,
    }));
    const ins = await guard.supabase.from("salesperson_commission_tiers").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  const up = await guard.supabase.from("salesperson_commission_settings").upsert(
    { user_id: userId, base_salary: base, updated_by: guard.userId },
    { onConflict: "user_id" }
  );
  if (up.error) return { ok: false, error: up.error.message };

  revalidatePath("/admin/staff");
  return { ok: true };
}
