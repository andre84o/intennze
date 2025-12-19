"use client";

import { useState } from "react";
import Link from "next/link";
import { Customer, Reminder, customerStatusLabels, CustomerStatus, LeadSource, leadSourceLabels, leadSourceColors } from "@/types/database";
import CustomerModal from "./CustomerModal";
import { createClient } from "@/utils/supabase/client";

interface Props {
  initialCustomers: Customer[];
  upcomingReminders: Reminder[];
  error?: string;
}

const statusColors: Record<CustomerStatus, string> = {
  lead: "bg-slate-500",
  contacted: "bg-blue-500",
  negotiating: "bg-yellow-500",
  customer: "bg-green-500",
  churned: "bg-red-500",
};

// Facebook-ikon SVG
const FacebookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Google Ads-ikon SVG
const GoogleAdsIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
  </svg>
);

// LinkedIn-ikon SVG
const LinkedInIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// Webbplats-ikon SVG
const WebsiteIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// Referens-ikon SVG
const ReferralIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

// Funktion för att hämta lead source-ikon
const getLeadSourceIcon = (source: string | null) => {
  if (!source) return null;

  const sourceKey = source.toLowerCase().replace(/\s+/g, '_') as LeadSource;

  switch (sourceKey) {
    case 'facebook_ads':
      return <FacebookIcon />;
    case 'google_ads':
      return <GoogleAdsIcon />;
    case 'linkedin':
      return <LinkedInIcon />;
    case 'website':
      return <WebsiteIcon />;
    case 'referral':
      return <ReferralIcon />;
    default:
      return null;
  }
};

// Funktion för att hämta lead source-färg
const getLeadSourceColor = (source: string | null): string => {
  if (!source) return 'bg-slate-500';

  const sourceKey = source.toLowerCase().replace(/\s+/g, '_') as LeadSource;
  return leadSourceColors[sourceKey] || 'bg-slate-500';
};

// Funktion för att hämta lead source-label
const getLeadSourceLabel = (source: string | null): string => {
  if (!source) return source || '';

  const sourceKey = source.toLowerCase().replace(/\s+/g, '_') as LeadSource;
  return leadSourceLabels[sourceKey] || source;
};

export default function CustomersClient({
  initialCustomers,
  upcomingReminders,
  error,
}: Props) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      search === "" ||
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      customer.email?.toLowerCase().includes(search.toLowerCase()) ||
      customer.company_name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSave = async (savedCustomer: Customer) => {
    if (editingCustomer) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === savedCustomer.id ? savedCustomer : c))
      );
    } else {
      setCustomers((prev) => [savedCustomer, ...prev]);
    }
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna kund?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (!error) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const stats = {
    total: customers.length,
    leads: customers.filter((c) => c.status === "lead").length,
    customers: customers.filter((c) => c.status === "customer").length,
    withService: customers.filter((c) => c.has_service_agreement).length,
    fromFacebook: customers.filter((c) => c.source === "facebook_ads").length,
  };

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
            Kunder
          </h1>
          <p className="text-slate-400 mt-1">Hantera dina kunder och leads</p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all duration-300"
        >
          + Ny kund
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="p-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">Totalt</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">Leads</p>
          <p className="text-2xl font-bold text-blue-400">{stats.leads}</p>
        </div>
        <div className="p-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">Kunder</p>
          <p className="text-2xl font-bold text-green-400">{stats.customers}</p>
        </div>
        <div className="p-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">Serviceavtal</p>
          <p className="text-2xl font-bold text-purple-400">{stats.withService}</p>
        </div>
        <div className="p-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <FacebookIcon />
            <span>Facebook Ads</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.fromFacebook}</p>
        </div>
      </div>

      {/* Upcoming reminders */}
      {upcomingReminders.length > 0 && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Kommande påminnelser
          </h3>
          <div className="space-y-2">
            {upcomingReminders.slice(0, 5).map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {reminder.title}
                  {reminder.customer && (
                    <span className="text-slate-500 ml-2">
                      - {reminder.customer.first_name} {reminder.customer.last_name}
                    </span>
                  )}
                </span>
                <span className="text-amber-400">{reminder.reminder_date}</span>
              </div>
            ))}
          </div>
          <Link
            href="/admin/paminnelser"
            className="inline-block mt-3 text-sm text-amber-400 hover:text-amber-300"
          >
            Visa alla →
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Sök på namn, e-post eller företag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | "all")}
          className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">Alla statusar</option>
          {Object.entries(customerStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Customer list */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {customers.length === 0
              ? "Inga kunder ännu. Lägg till din första kund!"
              : "Inga kunder matchar din sökning."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Namn</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 hidden md:table-cell">Företag</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 hidden sm:table-cell">Kontakt</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 hidden lg:table-cell">Budget</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">
                            {customer.first_name} {customer.last_name}
                          </p>
                          {customer.source && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded text-white ${getLeadSourceColor(customer.source)} bg-opacity-80`}
                              title={getLeadSourceLabel(customer.source)}
                            >
                              {getLeadSourceIcon(customer.source)}
                              {customer.source === 'facebook_ads' && <span>FB</span>}
                            </span>
                          )}
                        </div>
                        {customer.has_service_agreement && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                            Serviceavtal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {customer.company_name || "-"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-sm">
                        {customer.email && (
                          <a href={`mailto:${customer.email}`} className="text-cyan-400 hover:underline block">
                            {customer.email}
                          </a>
                        )}
                        {customer.phone && (
                          <a href={`tel:${customer.phone}`} className="text-slate-400 hover:text-white">
                            {customer.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusColors[customer.status]} bg-opacity-20`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors[customer.status]}`} />
                        {customerStatusLabels[customer.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                      {customer.budget ? `${customer.budget.toLocaleString()} kr` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/kunder/${customer.id}`}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Visa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => {
                            setEditingCustomer(customer);
                            setShowModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Redigera"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Ta bort"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => {
            setShowModal(false);
            setEditingCustomer(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
