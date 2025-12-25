"use client";

import { useState, useEffect } from "react";

interface Props {
  token: string;
  customerName: string;
  companyName: string | null;
}

interface FormData {
  // Företagsuppgifter
  company_name: string;
  org_number: string;
  contact_person: string;
  position: string;
  // Adressuppgifter
  address: string;
  postal_code: string;
  city: string;
  // Projektinfo
  industry: string;
  has_domain: boolean | null;
  domain_name: string;
  wants_domain_help: boolean | null;
  domain_suggestions: string;
  wants_maintenance: boolean | null;
  page_count: string;
  has_content: boolean | null;
  content_help_needed: string;
  features: string[];
  other_features: string;
  design_preferences: string;
  reference_sites: string;
  timeline: string;
  additional_info: string;
}

const FEATURES_OPTIONS = [
  { id: "contact_form", label: "Kontaktformulär" },
  { id: "booking", label: "Bokningssystem" },
  { id: "webshop", label: "Webshop / E-handel" },
  { id: "blog", label: "Blogg / Nyheter" },
  { id: "gallery", label: "Bildgalleri / Portfolio" },
  { id: "social_feed", label: "Sociala medier-flöde" },
  { id: "newsletter", label: "Nyhetsbrev-registrering" },
  { id: "chat", label: "Chatt / Support" },
  { id: "map", label: "Karta / Hitta hit" },
  { id: "video", label: "Videor" },
  { id: "testimonials", label: "Kundrecensioner" },
  { id: "faq", label: "Vanliga frågor (FAQ)" },
];

const PAGE_COUNT_OPTIONS = [
  { value: "1-3", label: "1-3 sidor (Enkel)" },
  { value: "4-7", label: "4-7 sidor (Standard)" },
  { value: "8-15", label: "8-15 sidor (Större)" },
  { value: "15+", label: "Fler än 15 sidor" },
];

const TIMELINE_OPTIONS = [
  { value: "asap", label: "Så snart som möjligt" },
  { value: "1-2weeks", label: "1-2 veckor" },
  { value: "1month", label: "Inom 1 månad" },
  { value: "2-3months", label: "2-3 månader" },
  { value: "flexible", label: "Flexibel / Inget bråttom" },
];

export default function QuestionnaireClient({ token, customerName, companyName }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    // Företagsuppgifter
    company_name: companyName || "",
    org_number: "",
    contact_person: "",
    position: "",
    // Adressuppgifter
    address: "",
    postal_code: "",
    city: "",
    // Projektinfo
    industry: "",
    has_domain: null,
    domain_name: "",
    wants_domain_help: null,
    domain_suggestions: "",
    wants_maintenance: null,
    page_count: "",
    has_content: null,
    content_help_needed: "",
    features: [],
    other_features: "",
    design_preferences: "",
    reference_sites: "",
    timeline: "",
    additional_info: "",
  });

  // Mark as opened when loaded
  useEffect(() => {
    fetch("/api/questionnaire/opened", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  }, [token]);

  const updateField = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (featureId: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/questionnaire/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...formData }),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error submitting questionnaire:", error);
    }
    setLoading(false);
  };

  const totalSteps = 5;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Tack för dina svar!</h1>
          <p className="text-gray-600 mb-6">
            Vi har tagit emot dina önskemål och återkommer inom kort med mer information och en offert.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">i</span>
            </div>
            intenzze
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold">i</span>
            </div>
            <span className="font-bold text-2xl text-white">intenzze</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Berätta om ditt projekt</h1>
          <p className="text-slate-400">
            Hej {customerName}! Fyll i formuläret så får vi en bättre bild av vad ni behöver.
          </p>
          {companyName && (
            <p className="text-cyan-400 mt-1 font-medium">{companyName}</p>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Steg {step} av {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step 1: Företagsinfo & Adress */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Om er verksamhet</h2>

              <div className="space-y-6">
                {/* Företagsuppgifter */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Företagsuppgifter
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Företagsnamn</label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => updateField("company_name", e.target.value)}
                        placeholder="Företag AB"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Org.nummer</label>
                      <input
                        type="text"
                        value={formData.org_number}
                        onChange={(e) => updateField("org_number", e.target.value)}
                        placeholder="556677-8899"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Kontaktperson</label>
                      <input
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => updateField("contact_person", e.target.value)}
                        placeholder="Anna Andersson"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Befattning</label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => updateField("position", e.target.value)}
                        placeholder="VD"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Adressuppgifter */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Adressuppgifter
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Gatuadress</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        placeholder="Gatan 123"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Postnummer</label>
                        <input
                          type="text"
                          value={formData.postal_code}
                          onChange={(e) => updateField("postal_code", e.target.value)}
                          placeholder="123 45"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ort</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          placeholder="Stockholm"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vilken bransch är ni verksamma inom?
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                    placeholder="T.ex. Restaurang, Bygg, Frisör, Konsult..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Har ni en domän (webbadress)?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField("has_domain", true)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.has_domain === true
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-semibold text-gray-900">Ja, vi har domän</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("has_domain", false)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.has_domain === false
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-semibold text-gray-900">Nej</span>
                    </button>
                  </div>
                </div>

                {formData.has_domain === true && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Vilken domän?
                    </label>
                    <input
                      type="text"
                      value={formData.domain_name}
                      onChange={(e) => updateField("domain_name", e.target.value)}
                      placeholder="T.ex. mittforetag.se"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                )}

                {formData.has_domain === false && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Vill ni att vi hjälper er skaffa domän?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => updateField("wants_domain_help", true)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.wants_domain_help === true
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="font-semibold text-gray-900">Ja tack</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("wants_domain_help", false)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.wants_domain_help === false
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="font-semibold text-gray-900">Nej, vi fixar själva</span>
                      </button>
                    </div>

                    {formData.wants_domain_help === true && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Skriv 5 förslag på domännamn
                        </label>
                        <textarea
                          value={formData.domain_suggestions}
                          onChange={(e) => updateField("domain_suggestions", e.target.value)}
                          placeholder="T.ex:&#10;mittforetag.se&#10;foretagetmitt.se&#10;mittab.se&#10;foretaget.nu&#10;mittforetag.com"
                          rows={5}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ett förslag per rad</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Underhåll & Sidor */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Underhåll & Omfattning</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Vill ni att vi sköter underhåll av webbplatsen?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField("wants_maintenance", true)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.wants_maintenance === true
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-semibold text-gray-900">Ja tack</span>
                      <p className="text-xs text-gray-400 mt-1">Uppdateringar, säkerhet, support</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("wants_maintenance", false)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.wants_maintenance === false
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-semibold text-gray-900">Nej, vi sköter det själva</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Hur många sidor behöver webbplatsen?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {PAGE_COUNT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("page_count", option.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.page_count === option.value
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="font-semibold text-gray-900">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Innehåll */}
          {step === 3 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Innehåll</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Har ni bilder och texter klara?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField("has_content", true)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.has_content === true
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-semibold text-gray-900">Ja, allt är klart</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField("has_content", false);
                        updateField("content_help_needed", "some");
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.has_content === false && formData.content_help_needed === "some"
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-semibold text-gray-900">Delvis</span>
                      <p className="text-xs text-gray-500 mt-1">Behöver lite hjälp</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField("has_content", false);
                        updateField("content_help_needed", "all");
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.has_content === false && formData.content_help_needed === "all"
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-semibold text-gray-900">Nej</span>
                      <p className="text-xs text-gray-500 mt-1">Behöver hjälp med allt</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Designönskemål (valfritt)
                  </label>
                  <textarea
                    value={formData.design_preferences}
                    onChange={(e) => updateField("design_preferences", e.target.value)}
                    placeholder="Färger, stil, känsla... T.ex. 'Modern och minimalistisk' eller 'Varm och inbjudande'"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Referenssidor (valfritt)
                  </label>
                  <textarea
                    value={formData.reference_sites}
                    onChange={(e) => updateField("reference_sites", e.target.value)}
                    placeholder="Finns det webbplatser ni gillar stilen på? Skriv adresser här..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Funktioner */}
          {step === 4 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Funktioner</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Vilka funktioner behöver ni? (Välj alla som passar)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FEATURES_OPTIONS.map((feature) => (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => toggleFeature(feature.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          formData.features.includes(feature.id)
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-900">{feature.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Andra funktioner? (valfritt)
                  </label>
                  <textarea
                    value={formData.other_features}
                    onChange={(e) => updateField("other_features", e.target.value)}
                    placeholder="Beskriv andra funktioner ni behöver..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Tidslinje */}
          {step === 5 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Tidslinje</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    När vill ni ha webbplatsen klar?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {TIMELINE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("timeline", option.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.timeline === option.value
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Något mer vi bör veta? (valfritt)
                  </label>
                  <textarea
                    value={formData.additional_info}
                    onChange={(e) => updateField("additional_info", e.target.value)}
                    placeholder="Övrig information..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Tillbaka
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all shadow-lg"
              >
                Nästa
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? "Skickar..." : "Skicka svar"}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Dina svar behandlas konfidentiellt av intenzze</p>
        </div>
      </div>
    </div>
  );
}
