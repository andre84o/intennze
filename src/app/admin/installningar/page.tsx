"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface CompanySettings {
  company_name: string;
  org_number: string;
  vat_number: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  bankgiro: string;
  plusgiro: string;
  swish: string;
  bank_name: string;
  bank_account: string;
  iban: string;
  bic: string;
}

const defaultCompanySettings: CompanySettings = {
  company_name: "",
  org_number: "",
  vat_number: "",
  address: "",
  postal_code: "",
  city: "",
  country: "Sverige",
  email: "",
  phone: "",
  website: "",
  bankgiro: "",
  plusgiro: "",
  swish: "",
  bank_name: "",
  bank_account: "",
  iban: "",
  bic: "",
};

export default function SettingsPage() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [companyMessage, setCompanyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Company settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ email: user.email || "" });
      }

      // Fetch company settings
      try {
        const response = await fetch("/api/settings/company");
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setCompanySettings({
              company_name: data.settings.company_name || "",
              org_number: data.settings.org_number || "",
              vat_number: data.settings.vat_number || "",
              address: data.settings.address || "",
              postal_code: data.settings.postal_code || "",
              city: data.settings.city || "",
              country: data.settings.country || "Sverige",
              email: data.settings.email || "",
              phone: data.settings.phone || "",
              website: data.settings.website || "",
              bankgiro: data.settings.bankgiro || "",
              plusgiro: data.settings.plusgiro || "",
              swish: data.settings.swish || "",
              bank_name: data.settings.bank_name || "",
              bank_account: data.settings.bank_account || "",
              iban: data.settings.iban || "",
              bic: data.settings.bic || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch company settings:", err);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Lösenorden matchar inte" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Lösenordet måste vara minst 6 tecken" });
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Lösenordet har uppdaterats" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyMessage(null);
    setSavingCompany(true);

    try {
      const response = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companySettings),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Kunde inte spara");
      }

      setCompanyMessage({ type: "success", text: "Företagsinformation har sparats" });
    } catch (err) {
      setCompanyMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Kunde inte spara företagsinformation"
      });
    } finally {
      setSavingCompany(false);
    }
  };

  const updateCompanyField = (field: keyof CompanySettings, value: string) => {
    setCompanySettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="text-gray-500">Laddar...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto text-gray-900">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inställningar</h1>
        <p className="text-gray-500 mt-1">Hantera ditt konto och preferenser</p>
      </div>

      {/* Account info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Kontoinformation</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              E-post
            </label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Company info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Företagsinformation</h2>
        <p className="text-gray-500 text-sm mb-6">Denna information visas på fakturor och offerter</p>

        {companyMessage && (
          <div
            className={`p-3 rounded-lg mb-4 ${
              companyMessage.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {companyMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveCompanySettings} className="space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1 font-medium">
                Företagsnamn
              </label>
              <input
                type="text"
                value={companySettings.company_name}
                onChange={(e) => updateCompanyField("company_name", e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ditt Företag AB"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1 font-medium">
                Organisationsnummer
              </label>
              <input
                type="text"
                value={companySettings.org_number}
                onChange={(e) => updateCompanyField("org_number", e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="556123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Momsregistreringsnummer (VAT)
            </label>
            <input
              type="text"
              value={companySettings.vat_number}
              onChange={(e) => updateCompanyField("vat_number", e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SE556123456701"
            />
          </div>

          {/* Address */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Adress</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Gatuadress
                </label>
                <input
                  type="text"
                  value={companySettings.address}
                  onChange={(e) => updateCompanyField("address", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Exempelgatan 123"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1 font-medium">
                    Postnummer
                  </label>
                  <input
                    type="text"
                    value={companySettings.postal_code}
                    onChange={(e) => updateCompanyField("postal_code", e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 45"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1 font-medium">
                    Ort
                  </label>
                  <input
                    type="text"
                    value={companySettings.city}
                    onChange={(e) => updateCompanyField("city", e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Stockholm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1 font-medium">
                    Land
                  </label>
                  <input
                    type="text"
                    value={companySettings.country}
                    onChange={(e) => updateCompanyField("country", e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sverige"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Kontakt</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  E-post
                </label>
                <input
                  type="email"
                  value={companySettings.email}
                  onChange={(e) => updateCompanyField("email", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="info@foretag.se"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={companySettings.phone}
                  onChange={(e) => updateCompanyField("phone", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="08-123 456 78"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Webbplats
                </label>
                <input
                  type="url"
                  value={companySettings.website}
                  onChange={(e) => updateCompanyField("website", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.foretag.se"
                />
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Betalningsinformation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Bankgiro
                </label>
                <input
                  type="text"
                  value={companySettings.bankgiro}
                  onChange={(e) => updateCompanyField("bankgiro", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123-4567"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Plusgiro
                </label>
                <input
                  type="text"
                  value={companySettings.plusgiro}
                  onChange={(e) => updateCompanyField("plusgiro", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12 34 56-7"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Swish
                </label>
                <input
                  type="text"
                  value={companySettings.swish}
                  onChange={(e) => updateCompanyField("swish", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 456 78 90"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Banknamn
                </label>
                <input
                  type="text"
                  value={companySettings.bank_name}
                  onChange={(e) => updateCompanyField("bank_name", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nordea"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Bankkontonummer
                </label>
                <input
                  type="text"
                  value={companySettings.bank_account}
                  onChange={(e) => updateCompanyField("bank_account", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1234 12 34567"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  IBAN
                </label>
                <input
                  type="text"
                  value={companySettings.iban}
                  onChange={(e) => updateCompanyField("iban", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SE12 3456 7890 1234 5678 9012"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  BIC/SWIFT
                </label>
                <input
                  type="text"
                  value={companySettings.bic}
                  onChange={(e) => updateCompanyField("bic", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="NDEASESS"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingCompany}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium shadow-sm"
          >
            {savingCompany ? "Sparar..." : "Spara företagsinformation"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Byt lösenord</h2>

        {message && (
          <div
            className={`p-3 rounded-lg mb-4 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Nytt lösenord
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1 font-medium">
              Bekräfta nytt lösenord
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium shadow-sm"
          >
            {saving ? "Sparar..." : "Uppdatera lösenord"}
          </button>
        </form>
      </div>

      {/* Integrations info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrationer</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Meta Conversions API</p>
                <p className="text-gray-500 text-sm">Spårar leadstatus i Meta Ads</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 text-xs rounded-full font-medium">
              Aktiv
            </span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Session</h2>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors font-medium"
        >
          Logga ut
        </button>
      </div>
    </div>
  );
}
