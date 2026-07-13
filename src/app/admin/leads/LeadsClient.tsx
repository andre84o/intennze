"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  assignLead,
  setLeadRead,
  archiveLead,
  findDuplicateCustomers,
  type DuplicateCustomer,
} from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Lead {
  id: string;
  created_at: string;
  source: string;
  external_id: string | null;
  status: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  customer_id: string | null;
  is_read: boolean;
}

export interface AssignableUser {
  user_id: string;
  email: string;
  role: string;
}

type Tab = "new" | "assigned" | "archived";

const SOURCE_LABEL: Record<string, string> = {
  contact_form: "Kontaktformulär",
  facebook: "Facebook",
};

function splitName(name: string | null): { first: string; last: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

export default function LeadsClient({
  leads,
  assignableUsers,
  error,
}: {
  leads: Lead[];
  assignableUsers: AssignableUser[];
  error?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("new");
  const [active, setActive] = useState<Lead | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      new: leads.filter((l) => l.status === "new").length,
      assigned: leads.filter((l) => l.status === "assigned").length,
      archived: leads.filter((l) => l.status === "archived").length,
    }),
    [leads]
  );

  const visible = leads.filter((l) => l.status === tab);

  const toggleRead = (lead: Lead) =>
    startTransition(async () => {
      await setLeadRead(lead.id, !lead.is_read);
      router.refresh();
    });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500">
          Publika leads från kontaktformulär och Facebook. Endast admin. Tilldela
          en lead till en säljare för att skapa kunden.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(["new", "assigned", "archived"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "new" ? "Nya" : t === "assigned" ? "Tilldelade" : "Arkiverade"}
            <span className="ml-1.5 text-xs text-gray-400">({counts[t]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">Inga leads här.</p>
        )}
        {visible.map((lead) => (
          <div
            key={lead.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 bg-white ${
              lead.is_read ? "border-gray-200" : "border-blue-200 bg-blue-50/40"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {SOURCE_LABEL[lead.source] ?? lead.source}
                </span>
                {!lead.is_read && lead.status === "new" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Ny
                  </span>
                )}
                <span className="font-medium text-gray-900 truncate">
                  {lead.name || lead.email || "Okänd"}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate">
                {[lead.email, lead.phone, lead.company].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(lead.created_at).toLocaleString("sv-SE")}
            </span>
            {lead.status === "assigned" && lead.customer_id && (
              <Link
                href={`/admin/kunder/${lead.customer_id}`}
                className="text-xs text-blue-600 hover:underline whitespace-nowrap"
              >
                Visa kund
              </Link>
            )}
            <button
              onClick={() => toggleRead(lead)}
              disabled={pending}
              className="text-xs text-gray-400 hover:text-gray-700"
              title={lead.is_read ? "Markera oläst" : "Markera läst"}
            >
              {lead.is_read ? "Oläst" : "Läst"}
            </button>
            <button
              onClick={() => setActive(lead)}
              className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700"
            >
              Öppna
            </button>
          </div>
        ))}
      </div>

      {active && (
        <LeadDetailModal
          lead={active}
          assignableUsers={assignableUsers}
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

function LeadDetailModal({
  lead,
  assignableUsers,
  onClose,
  onDone,
}: {
  lead: Lead;
  assignableUsers: AssignableUser[];
  onClose: () => void;
  onDone: () => void;
}) {
  const initial = splitName(lead.name);
  const [firstName, setFirstName] = useState(initial.first);
  const [lastName, setLastName] = useState(initial.last);
  const [staffId, setStaffId] = useState(assignableUsers[0]?.user_id ?? "");
  const [dupes, setDupes] = useState<DuplicateCustomer[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isNew = lead.status === "new";

  // Load duplicate warning once when a NEW lead is opened.
  useEffect(() => {
    if (!isNew) return;
    findDuplicateCustomers(lead.email, lead.phone).then((r) => {
      if (r.ok) setDupes(r.matches);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doAssign = () =>
    startTransition(async () => {
      setErr(null);
      if (!staffId) return setErr("Välj en mottagare.");
      if (!firstName.trim()) return setErr("Förnamn krävs.");
      const res = await assignLead(lead.id, staffId, firstName, lastName);
      if (!res.ok) return setErr(res.error ?? "Kunde inte tilldela.");
      onDone();
    });

  const doArchive = () =>
    startTransition(async () => {
      setErr(null);
      const res = await archiveLead(lead.id);
      if (!res.ok) return setErr(res.error ?? "Kunde inte arkivera.");
      onDone();
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Read-only lead payload */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Källa" value={SOURCE_LABEL[lead.source] ?? lead.source} />
            <Field label="Mottagen" value={new Date(lead.created_at).toLocaleString("sv-SE")} />
            <Field label="E-post" value={lead.email ?? "—"} />
            <Field label="Telefon" value={lead.phone ?? "—"} />
            <Field label="Företag" value={lead.company ?? "—"} />
            <Field label="Status" value={lead.status} />
          </div>
          {lead.message && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Meddelande</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {lead.message}
              </p>
            </div>
          )}

          {isNew ? (
            <>
              {dupes && dupes.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium">
                    En kund finns redan med samma e-post eller telefon:
                  </p>
                  <ul className="mt-1 list-disc list-inside">
                    {dupes.map((d) => (
                      <li key={d.id}>
                        <Link href={`/admin/kunder/${d.id}`} className="underline">
                          {[d.first_name, d.last_name].filter(Boolean).join(" ") ||
                            d.email ||
                            d.id}
                        </Link>{" "}
                        {d.email ? `· ${d.email}` : ""} {d.phone ? `· ${d.phone}` : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs">
                    Avbryt och hantera dubletten manuellt om detta är samma person.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">Förnamn *</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">Efternamn</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>

              <label className="text-sm block">
                <span className="block text-xs text-gray-500 mb-1">Tilldela till</span>
                {assignableUsers.length === 0 ? (
                  <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400">
                    Inga aktiva användare
                  </div>
                ) : (
                  <Select value={staffId} onValueChange={setStaffId}>
                    <SelectTrigger className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200">
                      <SelectValue placeholder="Välj mottagare..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {assignableUsers.map((u) => (
                        <SelectItem
                          key={u.user_id}
                          value={u.user_id}
                          className="rounded-lg"
                        >
                          {u.email} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </label>
            </>
          ) : (
            lead.customer_id && (
              <Link
                href={`/admin/kunder/${lead.customer_id}`}
                className="inline-block text-sm text-blue-600 hover:underline"
              >
                Visa skapad kund →
              </Link>
            )
          )}

          {err && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Avbryt
          </button>
          {lead.status !== "archived" && (
            <button
              onClick={doArchive}
              disabled={pending}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Arkivera
            </button>
          )}
          {isNew && (
            <button
              onClick={doAssign}
              disabled={pending || !staffId}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Skapar…" : "Skapa & tilldela kund"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-900 break-words">{value}</p>
    </div>
  );
}
