"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteStaff,
  updateStaff,
  setStaffStatus,
  replaceStaffPermissions,
  type StaffListItem,
} from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">
            Invite and manage admins and staff, their status and permissions. Admin only.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
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
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(["active", "invited", "suspended", "ended"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors capitalize ${
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
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {fullName(row) || row.email || row.auth_email || "Unnamed"}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}
                  >
                    {status}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {row.role ?? "—"}
                  </span>
                  {isSelf && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
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
    <label className="text-sm block">
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
}: {
  selected: Set<string>;
  onToggle: (value: string, checked: boolean) => void;
}) {
  return (
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
            <label className="text-sm block">
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
            <PermissionCheckboxes selected={perms} onToggle={togglePerm} />
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
        <TextField
          label="Employment start"
          type="date"
          value={employmentStart}
          onChange={setEmploymentStart}
        />
        <div className="text-sm">
          <label className="flex items-center gap-2 mb-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={currentlyEmployed}
              onChange={(e) => {
                setCurrentlyEmployed(e.target.checked);
                if (e.target.checked) setEmploymentEnd("");
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700">Currently employed</span>
          </label>
          {currentlyEmployed ? (
            <p className="text-xs text-gray-400">
              Uncheck when the person leaves to set an end date.
            </p>
          ) : (
            <TextField
              label="Employment end"
              type="date"
              value={employmentEnd}
              onChange={setEmploymentEnd}
            />
          )}
        </div>
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
        <PermissionCheckboxes selected={perms} onToggle={togglePerm} />
      </div>

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
