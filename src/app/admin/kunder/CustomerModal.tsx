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
  country: "Sverige",
  company_name: "",
  org_number: "",
  contact_person: "",
  position: "",
  budget: "",
  wishes: "",
  notes: "",
  status: "lead",
  has_purchased: false,
  has_service_agreement: false,
  service_type: "",
  service_price: "",
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
          country: customer.country || "Sverige",
          company_name: customer.company_name || "",
          org_number: customer.org_number || "",
          contact_person: customer.contact_person || "",
          position: customer.position || "",
          budget: customer.budget?.toString() || "",
          wishes: customer.wishes || "",
          notes: customer.notes || "",
          status: customer.status,
          has_purchased: customer.has_purchased,
          has_service_agreement: customer.has_service_agreement,
          service_type: customer.service_type || "",
          service_price: customer.service_price?.toString() || "",
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
      country: formData.country || null,
      company_name: formData.company_name || null,
      org_number: formData.org_number || null,
      contact_person: formData.contact_person || null,
      position: formData.position || null,
      wishes: formData.wishes || null,
      notes: formData.notes || null,
      service_type: formData.service_type || null,
      service_price: formData.service_price ? parseInt(formData.service_price) : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />

      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-none px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {customer ? "Redigera kund" : "Ny kund"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {customer ? "Uppdatera kundinformation och inställningar" : "Lägg till en ny kund i systemet"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Grundläggande info */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold pb-2 border-b border-gray-100">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3>Personuppgifter</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Förnamn *</label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="Förnamn"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Efternamn *</label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="Efternamn"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">E-post</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                      placeholder="exempel@foretag.se"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Telefon</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                      placeholder="070-123 45 67"
                    />
                  </div>
                </section>

                {/* Företagsinfo */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold pb-2 border-b border-gray-100">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3>Företagsuppgifter</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Företagsnamn</label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="Företag AB"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Org.nummer</label>
                      <input
                        type="text"
                        value={formData.org_number}
                        onChange={(e) => setFormData({ ...formData, org_number: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="556677-8899"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Kontaktperson</label>
                      <input
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="Anna Andersson"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Befattning</label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="VD"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Budget (kr)</label>
                      <input
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Adress */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold pb-2 border-b border-gray-100">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3>Adressuppgifter</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Gatuadress</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="Gata 123"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Postnummer</label>
                        <input
                          type="text"
                          value={formData.postal_code}
                          onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                          placeholder="123 45"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Ort</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                          placeholder="Stad"
                        />
                      </div>
                    </div>
                    
                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Land</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        placeholder="Sverige"
                      />
                    </div>
                  </div>
                </section>

                {/* Status & Övrigt */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold pb-2 border-b border-gray-100">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3>Status & Inställningar</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Status</label>
                      <div className="relative">
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 appearance-none focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        >
                          {Object.entries(customerStatusLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Källa</label>
                      <div className="relative">
                        <select
                          value={formData.source}
                          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 appearance-none focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        >
                          <option value="">Välj källa...</option>
                          {Object.entries(leadSourceLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="has_purchased"
                      checked={formData.has_purchased}
                      onChange={(e) => setFormData({ ...formData, has_purchased: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                    />
                    <label htmlFor="has_purchased" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                      Har köpt tidigare
                    </label>
                  </div>

                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="has_service_agreement"
                        checked={formData.has_service_agreement}
                        onChange={(e) => setFormData({ ...formData, has_service_agreement: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                      />
                      <label htmlFor="has_service_agreement" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                        Har serviceavtal
                      </label>
                    </div>

                    {formData.has_service_agreement && (
                      <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 fade-in">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Typ av avtal</label>
                            <input
                              type="text"
                              value={formData.service_type}
                              onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                              placeholder="t.ex. Hosting"
                            />
                          </div>
                          <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pris (kr/mån)</label>
                            <input
                              type="number"
                              value={formData.service_price}
                              onChange={(e) => setFormData({ ...formData, service_price: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Startdatum</label>
                            <input
                              type="date"
                              value={formData.service_start_date}
                              onChange={(e) => setFormData({ ...formData, service_start_date: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                          <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Förnyelsedatum</label>
                            <input
                              type="date"
                              value={formData.service_renewal_date}
                              onChange={(e) => setFormData({ ...formData, service_renewal_date: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Full Width Section */}
            <section className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-gray-900 font-semibold pb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3>Anteckningar</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Önskemål / Behov</label>
                  <textarea
                    rows={4}
                    value={formData.wishes}
                    onChange={(e) => setFormData({ ...formData, wishes: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 resize-none"
                    placeholder="Kundens önskemål..."
                  />
                </div>
                <div className="group">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-600 transition-colors">Interna anteckningar</label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 resize-none"
                    placeholder="Endast synligt för admin..."
                  />
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="flex-none px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-xl transition-colors duration-200"
          >
            Avbryt
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sparar...
              </>
            ) : (
              "Spara ändringar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
