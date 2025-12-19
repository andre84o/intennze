"use client";

import { useState } from "react";
import { Customer, CustomerFormData, CustomerStatus, customerStatusLabels, leadSourceLabels, LeadSource } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

interface Props {
  customer: Customer | null;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

const initialFormData: CustomerFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  postal_code: "",
  city: "",
  company_name: "",
  org_number: "",
  budget: "",
  wishes: "",
  notes: "",
  status: "lead",
  has_purchased: false,
  has_service_agreement: false,
  service_type: "",
  service_start_date: "",
  service_renewal_date: "",
  source: "",
};

export default function CustomerModal({ customer, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<CustomerFormData>(
    customer
      ? {
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
          postal_code: customer.postal_code || "",
          city: customer.city || "",
          company_name: customer.company_name || "",
          org_number: customer.org_number || "",
          budget: customer.budget?.toString() || "",
          wishes: customer.wishes || "",
          notes: customer.notes || "",
          status: customer.status,
          has_purchased: customer.has_purchased,
          has_service_agreement: customer.has_service_agreement,
          service_type: customer.service_type || "",
          service_start_date: customer.service_start_date || "",
          service_renewal_date: customer.service_renewal_date || "",
          source: customer.source || "",
        }
      : initialFormData
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const data = {
      ...formData,
      budget: formData.budget ? parseInt(formData.budget) : null,
      // Ensure empty strings are null for optional fields
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      postal_code: formData.postal_code || null,
      city: formData.city || null,
      company_name: formData.company_name || null,
      org_number: formData.org_number || null,
      wishes: formData.wishes || null,
      notes: formData.notes || null,
      service_type: formData.service_type || null,
      service_start_date: formData.service_start_date || null,
      service_renewal_date: formData.service_renewal_date || null,
      source: formData.source || null,
    };

    if (customer) {
      const { data: updated, error } = await supabase
        .from("customers")
        .update(data)
        .eq("id", customer.id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      onSave(updated);
    } else {
      const { data: created, error } = await supabase
        .from("customers")
        .insert(data)
        .select()
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      onSave(created);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {customer ? "Redigera kund" : "Ny kund"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Grundläggande info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Grundläggande info</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Förnamn *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Efternamn *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Företagsinfo */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Företagsinfo</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Företagsnamn</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisationsnummer</label>
                <input
                  type="text"
                  value={formData.org_number}
                  onChange={(e) => setFormData({ ...formData, org_number: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (kr)</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Adress */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Adress</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gatuadress</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postnummer</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Status & Övrigt */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status & Övrigt</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(customerStatusLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Källa</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Välj källa...</option>
                      {Object.entries(leadSourceLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="has_purchased"
                      checked={formData.has_purchased}
                      onChange={(e) => setFormData({ ...formData, has_purchased: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="has_purchased" className="text-sm font-medium text-gray-700">
                      Har köpt tidigare
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="has_service_agreement"
                      checked={formData.has_service_agreement}
                      onChange={(e) => setFormData({ ...formData, has_service_agreement: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="has_service_agreement" className="text-sm font-medium text-gray-700">
                      Har serviceavtal
                    </label>
                  </div>

                  {formData.has_service_agreement && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Typ av avtal</label>
                        <input
                          type="text"
                          value={formData.service_type}
                          onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="t.ex. Hosting, Support"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                          <input
                            type="date"
                            value={formData.service_start_date}
                            onChange={(e) => setFormData({ ...formData, service_start_date: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Förnyelsedatum</label>
                          <input
                            type="date"
                            value={formData.service_renewal_date}
                            onChange={(e) => setFormData({ ...formData, service_renewal_date: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Anteckningar */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Önskemål / Behov</label>
                <textarea
                  rows={3}
                  value={formData.wishes}
                  onChange={(e) => setFormData({ ...formData, wishes: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interna anteckningar</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sparar..." : "Spara"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
