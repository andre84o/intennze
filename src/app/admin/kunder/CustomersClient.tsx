"use client";

import { useState } from "react";
import Link from "next/link";
import { Customer, customerStatusLabels, CustomerStatus, leadSourceLabels, leadSourceColors } from "@/types/database";
import CustomerModal from "./CustomerModal";
import { LeadSourceIcon } from "@/components/lead-source-icon";
import { createClient } from "@/utils/supabase/client";

interface Props {
  initialCustomers: Customer[];
  error?: string;
}

const statusColors: Record<CustomerStatus, string> = {
  lead: "bg-gray-500",
  contacted: "bg-blue-500",
  negotiating: "bg-amber-500",
  customer: "bg-green-500",
  churned: "bg-red-500",
};

const statusBadges: Record<CustomerStatus, string> = {
  lead: "bg-gray-100 text-gray-700 border-gray-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  negotiating: "bg-amber-50 text-amber-700 border-amber-200",
  customer: "bg-green-50 text-green-700 border-green-200",
  churned: "bg-red-50 text-red-700 border-red-200",
};

// Helper functions for lead source
const getLeadSourceLabel = (source: string | null) => {
  if (!source) return "";
  return leadSourceLabels[source as keyof typeof leadSourceLabels] || source;
};

const getLeadSourceColor = (source: string | null) => {
  if (!source) return "bg-gray-500";
  return leadSourceColors[source as keyof typeof leadSourceColors] || "bg-gray-500";
};

// Check if service agreement has expired
const isServiceExpired = (customer: Customer) => {
  if (!customer.has_service_agreement || !customer.service_renewal_date) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewalDate = new Date(customer.service_renewal_date);
  renewalDate.setHours(0, 0, 0, 0);
  return renewalDate < today;
};

export default function CustomersClient({
  initialCustomers,
  error,
}: Props) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        search === "" ||
        `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        customer.email?.toLowerCase().includes(search.toLowerCase()) ||
        customer.company_name?.toLowerCase().includes(search.toLowerCase());

      return matchesSearch;
    })
    .sort((a, b) => {
      // Expired service agreements first
      const aExpired = isServiceExpired(a);
      const bExpired = isServiceExpired(b);
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      // Newest first.
      return (b.created_at || "").localeCompare(a.created_at || "");
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

  const handleDelete = (id: string) => {
    setCustomerToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    const supabase = createClient();
    const { error } = await supabase.from("customers").delete().eq("id", customerToDelete);

    if (!error) {
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete));
    }
    setShowDeleteModal(false);
    setCustomerToDelete(null);
  };

  return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Kunder
          </h1>
          <p className="text-gray-500 mt-1">Hantera dina kunder och leads</p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-300 shadow-sm"
        >
          + Ny kund
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Totalt</p>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Leads</p>
          <p className="text-2xl font-bold text-blue-600">{customers.filter((c) => c.status === "lead").length}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Kunder</p>
          <p className="text-2xl font-bold text-green-600">{customers.filter((c) => c.status === "customer").length}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Serviceavtal</p>
          <p className="text-2xl font-bold text-purple-600">{customers.filter((c) => c.has_service_agreement).length}</p>
        </div>
        {customers.filter((c) => isServiceExpired(c)).length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <p className="text-red-600 text-sm">Utgångna avtal</p>
            <p className="text-2xl font-bold text-red-600">{customers.filter((c) => isServiceExpired(c)).length}</p>
          </div>
        )}
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <LeadSourceIcon source="facebook_ads" size={16} />
            <span>Facebook Ads</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{customers.filter((c) => c.source === "facebook_ads").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Sök på namn, e-post eller företag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customer list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {customers.length === 0
              ? "Inga kunder ännu. Lägg till din första kund!"
              : "Inga kunder matchar din sökning."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Namn</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">Företag</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden sm:table-cell">Kontakt</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden lg:table-cell">Budget</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => {
                  const expired = isServiceExpired(customer);
                  return (
                  <tr key={customer.id} className={`transition-colors ${expired ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${expired ? "text-red-900" : "text-gray-900"}`}>
                            {customer.first_name} {customer.last_name}
                          </p>
                          {customer.source && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded text-white ${getLeadSourceColor(customer.source)} bg-opacity-90`}
                              title={getLeadSourceLabel(customer.source)}
                            >
                              <LeadSourceIcon source={customer.source} size={14} />
                            </span>
                          )}
                        </div>
                        {customer.has_service_agreement && (
                          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs rounded ${expired ? "bg-red-200 text-red-800" : "bg-purple-100 text-purple-700"}`}>
                            {expired && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            {expired ? `Utgånget ${customer.service_renewal_date}` : "Serviceavtal"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {customer.company_name || "-"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-sm">
                        {customer.email && (
                          <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline block">
                            {customer.email}
                          </a>
                        )}
                        {customer.phone && (
                          <a href={`tel:${customer.phone}`} className="text-gray-500 hover:text-gray-900">
                            {customer.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadges[customer.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors[customer.status]}`} />
                        {customerStatusLabels[customer.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {customer.budget ? `${customer.budget.toLocaleString()} kr` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/kunder/${customer.id}`}
                          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Redigera"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ta bort"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ta bort kund</h3>
            <p className="text-gray-500 mb-6">
              Är du säker på att du vill ta bort denna kund? Detta går inte att ångra.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCustomerToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
