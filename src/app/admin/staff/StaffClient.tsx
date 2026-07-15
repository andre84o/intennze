"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteStaff,
  updateStaff,
  setStaffStatus,
  replaceStaffPermissions,
  getSalespersonCommissionConfig,
  saveSalespersonCommissionConfig,
  type StaffListItem,
  type CommissionTierInput,
} from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Canonical permission values — MUST match the server allowlist exactly.
const PERMISSIONS: { value: string; label: string }[] = [
  { value: "crm.access", label: "CRM access" },
  { value: "customers.view_own", label: "View own customers" },
  { value: "customers.create", label: "Create customers" },
  { value: "customers.update_own", label: "Update own customers" },
  { value: "quotes.view_own", label: "View own quotes" },
  { value: "quotes.create", label: "Create quotes" },
  { value: "quotes.update_own", label: "Update own quotes" },
  { value: "emails.send", label: "Send emails" },
  { value: "reminders.manage_own", label: "Manage own reminders" },
  { value: "attachments.upload", label: "Upload attachments" },
];

type Tab = "active" | "invited" | "suspended" | "ended";

type DisplayStatus = "Invited" | "Active" | "Suspended" | "Ended";

function displayStatus(row: StaffListItem): DisplayStatus {
  if (row.account_status === "suspended") return "Suspended";
  if (row.account_status === "ended") return "Ended";
  if (row.login_state === "invited" && row.account_status === "active") return "Invited";
  return "Active";
}

const STATUS_BADGE: Record<DisplayStatus, string> = {
  Invited: "bg-amber-100 text-amber-700",
  Active: "bg-green-100 text-green-700",
  Suspended: "bg-orange-100 text-orange-700",
  Ended: "bg-gray-200 text-gray-600",
};

function fullName(row: StaffListItem): string {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
}

export default function StaffClient({
  staff,
  currentUserId,
  error,
}: {
  staff: StaffListItem[];
  currentUserId: string;
  error?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [active, setActive] = useState<StaffListItem | null>(null);

  const counts = useMemo(() => {
    const c = { active: 0, invited: 0, suspended: 0, ended: 0 };
    for (const row of staff) {
      const s = displayStatus(row);
      if (s === "Active") c.active += 1;
      else if (s === "Invited") c.invited += 1;
      else if (s === "Suspended") c.suspended += 1;
      else if (s === "Ended") c.ended += 1;
    }
    return c;
  }, [staff]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((row) => {
      const s = displayStatus(row).toLowerCase();
      if (s !== tab) return false;
      if (!q) return true;
      const hay = [fullName(row), row.email, row.auth_email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [staff, tab, search]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">
            Invite and manage admins and staff, their status and permissions. Admin only.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="w-full shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 whitespace-nowrap sm:w-auto"
        >
          Invite staff
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["active", "invited", "suspended", "ended"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t}
            <span className="ml-1.5 text-xs text-gray-400">({counts[t]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">No staff here.</p>
        )}
        {visible.map((row) => {
          const status = displayStatus(row);
          const isSelf = row.user_id === currentUserId;
          return (
            <div
              key={row.user_id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 bg-white"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 max-w-full truncate font-medium text-gray-900">
                    {fullName(row) || row.email || row.auth_email || "Unnamed"}
                  </span>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}
                  >
                    {status}
                  </span>
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {row.role ?? "—"}
                  </span>
                  {isSelf && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {[row.email ?? row.auth_email, row.job_title].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                onClick={() => setActive(row)}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700"
              >
                Open
              </button>
            </div>
          );
        })}
      </div>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onDone={() => {
            setInviteOpen(false);
            router.refresh();
          }}
        />
      )}

      {active && (
        <StaffDetailModal
          row={active}
          isSelf={active.user_id === currentUserId}
          onClose={() => setActive(null)}
          onDone={() => {
            setActive(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared field primitives (match admin style)
// ---------------------------------------------------------------------------

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="text-sm block min-w-0">
      <span className="block text-xs text-gray-500 mb-1">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all ${
          disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"
        }`}
      />
    </label>
  );
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function DateField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = parseISODate(value);

  return (
    <label className="text-sm block min-w-0">
      <span className="block text-xs text-gray-500 mb-1">
        {label}
        {required ? " *" : ""}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-2 text-left transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
              disabled
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-white"
            } ${date ? "text-gray-900" : "text-gray-400"}`}
          >
            <span className="truncate">
              {date ? date.toLocaleDateString("sv-SE") : "Välj datum"}
            </span>
            <svg
              className="size-4 flex-shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="date-popover-content z-[60] w-auto rounded-2xl border border-slate-200 p-0 shadow-xl"
          align="start"
        >
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(d) => {
              onChange(d ? toISODate(d) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </label>
  );
}

function RoleSelect({
  value,
  onValueChange,
  disabled = false,
}: {
  value: "admin" | "staff";
  onValueChange: (v: "admin" | "staff") => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as "admin" | "staff")}
      disabled={disabled}
    >
      <SelectTrigger className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
        <SelectValue placeholder="Select role..." />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        <SelectItem value="staff" className="rounded-lg">
          Staff
        </SelectItem>
        <SelectItem value="admin" className="rounded-lg">
          Admin
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function PermissionCheckboxes({
  selected,
  onToggle,
  onSelectAll,
}: {
  selected: Set<string>;
  onToggle: (value: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
}) {
  const allSelected =
    selected.size >= PERMISSIONS.length &&
    PERMISSIONS.every((p) => selected.has(p.value));
  return (
    <div className="space-y-2">
      {onSelectAll && (
        <label className="flex w-fit items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Select all
        </label>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PERMISSIONS.map((p) => (
          <label
            key={p.value}
            className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selected.has(p.value)}
              onChange={(e) => onToggle(p.value, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">{p.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Checkbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor={id} className="text-sm text-gray-700 cursor-pointer select-none">
        {label}
      </label>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  footer,
  mobileFullScreen = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  mobileFullScreen?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4 ${
        mobileFullScreen ? "p-0" : "items-center justify-center p-4"
      }`}
    >
      <div
        className={`bg-white shadow-xl flex flex-col sm:w-full sm:max-w-2xl sm:max-h-[90vh] sm:rounded-2xl ${
          mobileFullScreen
            ? "w-full h-full rounded-none"
            : "w-full max-h-[90vh] rounded-2xl"
        }`}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-none">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-none">
          {footer}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite modal
// ---------------------------------------------------------------------------

function InviteModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employmentStart, setEmploymentStart] = useState("");
  const [commissionEligible, setCommissionEligible] = useState(false);
  const [perms, setPerms] = useState<Set<string>>(new Set());

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const togglePerm = (value: string, checked: boolean) =>
    setPerms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });

  const setAllPerms = (checked: boolean) =>
    setPerms(checked ? new Set(PERMISSIONS.map((p) => p.value)) : new Set());

  const submit = () =>
    startTransition(async () => {
      setErr(null);
      if (!email.trim()) return setErr("Email is required.");
      if (!firstName.trim()) return setErr("First name is required.");

      const res = await inviteStaff({
        email: email.trim(),
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        addressLine: addressLine.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        country: country.trim(),
        jobTitle: jobTitle.trim(),
        employmentStart: employmentStart.trim(),
        commissionEligible,
        permissions: Array.from(perms),
      });

      if (!res.ok) return setErr(res.error ?? "Could not send invite.");
      setSuccess(true);
    });

  return (
    <ModalShell
      title="Invite staff"
      onClose={onClose}
      mobileFullScreen
      footer={
        success ? (
          <button
            onClick={onDone}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Done
          </button>
        ) : (
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={pending}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send invite"}
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Invite email sent to <span className="font-medium">{email.trim()}</span>. They can
          set their password from the link in the email.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Email"
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="name@company.com"
            />
            <label className="text-sm block min-w-0">
              <span className="block text-xs text-gray-500 mb-1">Role</span>
              <RoleSelect value={role} onValueChange={setRole} />
            </label>
            <TextField label="First name" required value={firstName} onChange={setFirstName} />
            <TextField label="Last name" value={lastName} onChange={setLastName} />
            <TextField label="Phone" value={phone} onChange={setPhone} />
            <TextField label="Job title" value={jobTitle} onChange={setJobTitle} />
            <TextField label="Address line" value={addressLine} onChange={setAddressLine} />
            <TextField label="Postal code" value={postalCode} onChange={setPostalCode} />
            <TextField label="City" value={city} onChange={setCity} />
            <TextField label="Country" value={country} onChange={setCountry} />
            <TextField
              label="Employment start"
              type="date"
              value={employmentStart}
              onChange={setEmploymentStart}
            />
          </div>

          <div className="pt-1">
            <Checkbox
              id="invite-commission"
              label="Commission eligible"
              checked={commissionEligible}
              onChange={setCommissionEligible}
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Permissions</p>
            <PermissionCheckboxes
              selected={perms}
              onToggle={togglePerm}
              onSelectAll={setAllPerms}
            />
          </div>

          {err && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
        </>
      )}
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Detail / edit modal
// ---------------------------------------------------------------------------

/**
 * Per-salesperson commission editor: an editable ladder (add/remove rows, own
 * thresholds + rates) plus an optional base salary. Base salary is stored for
 * ADMIN REFERENCE ONLY — never shown to the salesperson, never counted in their
 * sales figures. Loads/saves via admin-only server actions.
 */
function CommissionSection({ userId }: { userId: string }) {
  const [tiers, setTiers] = useState<CommissionTierInput[]>([]);
  const [baseSalary, setBaseSalary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr(null);
    getSalespersonCommissionConfig(userId).then((res) => {
      if (!active) return;
      if (res.ok && res.config) {
        setTiers(res.config.tiers);
        setBaseSalary(res.config.baseSalary == null ? "" : String(res.config.baseSalary));
      } else if (!res.ok) {
        setErr(res.error ?? "Could not load commission settings.");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const updateTier = (i: number, patch: Partial<CommissionTierInput>) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const addTier = () =>
    setTiers((prev) => {
      const last = prev[prev.length - 1];
      const nextMin = last ? (last.maxRevenueExVat ?? last.minRevenueExVat) + 1 : 0;
      return [...prev, { minRevenueExVat: nextMin, maxRevenueExVat: null, ratePercent: 0 }];
    });

  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));

  const save = () =>
    startTransition(async () => {
      setErr(null);
      setMsg(null);
      const res = await saveSalespersonCommissionConfig(userId, {
        tiers,
        baseSalary: baseSalary.trim() === "" ? null : parseFloat(baseSalary.replace(",", ".")),
      });
      if (!res.ok) return setErr(res.error ?? "Save failed.");
      setMsg("Commission saved.");
    });

  const cell = "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10";

  return (
    <div className="pt-2 border-t border-gray-100">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Commission ladder</p>
          <p className="text-[11px] text-gray-400">Own thresholds + rates per level. Falls back to the global ladder if left empty.</p>
        </div>
        <button
          onClick={save}
          disabled={pending || loading}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save commission"}
        </button>
      </div>

      {loading ? (
        <p className="py-3 text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_1fr_5rem_2rem] gap-2 px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
            <span>From (kr)</span>
            <span>To (kr)</span>
            <span>Rate %</span>
            <span />
          </div>
          <div className="space-y-1.5">
            {tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_5rem_2rem] items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={t.minRevenueExVat}
                  onChange={(e) => updateTier(i, { minRevenueExVat: e.target.value === "" ? 0 : Number(e.target.value) })}
                  className={cell}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="∞ (open)"
                  value={t.maxRevenueExVat ?? ""}
                  onChange={(e) => updateTier(i, { maxRevenueExVat: e.target.value === "" ? null : Number(e.target.value) })}
                  className={cell}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={t.ratePercent}
                  onChange={(e) => updateTier(i, { ratePercent: e.target.value === "" ? 0 : Number(e.target.value) })}
                  className={cell}
                />
                <button
                  onClick={() => removeTier(i)}
                  title="Remove row"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addTier}
            className="mt-2 text-sm px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            + Add row
          </button>

          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-1">Base salary (kr) — optional</p>
            <input
              type="number"
              min={0}
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              placeholder="e.g. 25000"
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            />
            <p className="mt-1 text-[11px] text-gray-400">Admin reference only — not shown to the salesperson and not counted in their sales figures.</p>
          </div>

          {msg && <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{msg}</div>}
          {err && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}
        </>
      )}
    </div>
  );
}

function StaffDetailModal({
  row,
  isSelf,
  onClose,
  onDone,
}: {
  row: StaffListItem;
  isSelf: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [firstName, setFirstName] = useState(row.first_name ?? "");
  const [lastName, setLastName] = useState(row.last_name ?? "");
  const [phone, setPhone] = useState(row.phone ?? "");
  const [addressLine, setAddressLine] = useState(row.address_line ?? "");
  const [postalCode, setPostalCode] = useState(row.postal_code ?? "");
  const [city, setCity] = useState(row.city ?? "");
  const [country, setCountry] = useState(row.country ?? "");
  const [jobTitle, setJobTitle] = useState(row.job_title ?? "");
  const [employmentStart, setEmploymentStart] = useState(row.employment_start ?? "");
  const [employmentEnd, setEmploymentEnd] = useState(row.employment_end ?? "");
  // "Currently employed" = no end date. Uncheck it when the person leaves to
  // reveal and set the employment end date.
  const [currentlyEmployed, setCurrentlyEmployed] = useState(!row.employment_end);
  const [commissionEligible, setCommissionEligible] = useState(row.commission_eligible === true);
  const [role, setRole] = useState<"admin" | "staff">(row.role === "admin" ? "admin" : "staff");

  const [perms, setPerms] = useState<Set<string>>(new Set(row.permissions ?? []));

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const status = displayStatus(row);
  const email = row.email ?? row.auth_email ?? "";

  // GUARD RAIL: the logged-in admin cannot demote themselves to staff, and
  // cannot suspend / end their own account. The DB trigger is the real guard;
  // this only hides the unsafe UI. Role change to admin is still allowed.
  const selfDemoteToStaff = isSelf; // block choosing "staff" for self

  const togglePerm = (value: string, checked: boolean) =>
    setPerms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });

  const setAllPerms = (checked: boolean) =>
    setPerms(checked ? new Set(PERMISSIONS.map((p) => p.value)) : new Set());

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    startTransition(async () => {
      setErr(null);
      setMsg(null);
      const res = await fn();
      if (!res.ok) return setErr(res.error ?? "Action failed.");
      setMsg(okMsg);
      onDone();
    });

  const saveProfile = () => {
    // Prevent self-demotion to staff on the client (server/DB also enforce it).
    const nextRole = isSelf && role === "staff" ? "admin" : role;
    run(
      () =>
        updateStaff(row.user_id, {
          firstName,
          lastName,
          phone,
          addressLine,
          postalCode,
          city,
          country,
          jobTitle,
          employmentStart,
          employmentEnd: currentlyEmployed ? "" : employmentEnd,
          commissionEligible,
          role: nextRole,
        }),
      "Saved."
    );
  };

  const savePermissions = () =>
    run(() => replaceStaffPermissions(row.user_id, Array.from(perms)), "Permissions saved.");

  const changeStatus = (next: "active" | "suspended" | "ended") =>
    run(() => setStaffStatus(row.user_id, next), "Status updated.");

  return (
    <ModalShell
      title="Staff member"
      onClose={onClose}
      mobileFullScreen
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={saveProfile}
            disabled={pending}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      {/* Read-only email + current status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Email (read-only)</p>
          <p className="text-sm text-gray-900 break-words rounded-lg border border-gray-200 bg-gray-100 px-3 py-2">
            {email || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Current status</p>
          <p className="text-sm">
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}
            >
              {status}
            </span>
          </p>
        </div>
      </div>

      {/* Editable profile fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label="First name" required value={firstName} onChange={setFirstName} />
        <TextField label="Last name" value={lastName} onChange={setLastName} />
        <TextField label="Phone" value={phone} onChange={setPhone} />
        <TextField label="Job title" value={jobTitle} onChange={setJobTitle} />
        <TextField label="Address line" value={addressLine} onChange={setAddressLine} />
        <TextField label="Postal code" value={postalCode} onChange={setPostalCode} />
        <TextField label="City" value={city} onChange={setCity} />
        <TextField label="Country" value={country} onChange={setCountry} />
        <DateField
          label="Employment start"
          value={employmentStart}
          onChange={setEmploymentStart}
        />
        <DateField
          label="Employment end"
          value={employmentEnd}
          onChange={setEmploymentEnd}
          disabled={currentlyEmployed}
        />
        <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={currentlyEmployed}
            onChange={(e) => {
              setCurrentlyEmployed(e.target.checked);
              if (e.target.checked) setEmploymentEnd("");
            }}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700">
            Currently employed
            <span className="text-gray-400">
              {" "}
              — uncheck to set an end date when the person leaves
            </span>
          </span>
        </label>
        <label className="text-sm block">
          <span className="block text-xs text-gray-500 mb-1">Role</span>
          <Select value={role} onValueChange={(v) => setRole(v as "admin" | "staff")}>
            <SelectTrigger className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {/* Block self-demotion to staff: only offer "staff" to others. */}
              {!selfDemoteToStaff && (
                <SelectItem value="staff" className="rounded-lg">
                  Staff
                </SelectItem>
              )}
              <SelectItem value="admin" className="rounded-lg">
                Admin
              </SelectItem>
            </SelectContent>
          </Select>
          {selfDemoteToStaff && (
            <span className="block text-xs text-gray-400 mt-1">
              You cannot change your own role to staff.
            </span>
          )}
        </label>
        <div className="flex items-end pb-2">
          <Checkbox
            id="detail-commission"
            label="Commission eligible"
            checked={commissionEligible}
            onChange={setCommissionEligible}
          />
        </div>
      </div>

      {/* Permissions with dedicated atomic save */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">Permissions</p>
          <button
            onClick={savePermissions}
            disabled={pending}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Save permissions
          </button>
        </div>
        <PermissionCheckboxes
          selected={perms}
          onToggle={togglePerm}
          onSelectAll={setAllPerms}
        />
      </div>

      {/* Commission ladder + base salary (only for commission-eligible members) */}
      {commissionEligible && <CommissionSection userId={row.user_id} />}

      {/* Status actions */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">Status actions</p>
        <div className="flex flex-wrap gap-2">
          {status === "Suspended" && (
            <button
              onClick={() => changeStatus("active")}
              disabled={pending}
              className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
          {status === "Ended" && (
            <button
              onClick={() => changeStatus("active")}
              disabled={pending}
              className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Activate
            </button>
          )}
          {(status === "Active" || status === "Invited") && (
            <button
              onClick={() => changeStatus("suspended")}
              disabled={pending || isSelf}
              title={isSelf ? "You cannot suspend your own account." : undefined}
              className="px-3 py-1.5 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suspend
            </button>
          )}
          {status !== "Ended" && (
            <button
              onClick={() => changeStatus("ended")}
              disabled={pending || isSelf}
              title={isSelf ? "You cannot end your own account." : undefined}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              End
            </button>
          )}
        </div>
        {isSelf && (
          <p className="text-xs text-gray-400 mt-2">
            Suspend and End are disabled on your own account.
          </p>
        )}
      </div>

      {msg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
    </ModalShell>
  );
}
