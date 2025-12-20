"use client";

import { useState, useEffect } from "react";

interface Props {
  token: string;
  customerName: string;
  companyName: string | null;
}

interface FormData {
  industry: string;
  has_domain: boolean | null;
  domain_name: string;
  wants_domain_help: boolean | null;
  wants_maintenance: boolean | null;
  page_count: string;
  has_content: boolean | null;
  content_help_needed: string;
  features: string[];
  other_features: string;
  design_preferences: string;
  reference_sites: string;
  budget_range: string;
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

const BUDGET_OPTIONS = [
  { value: "5000-10000", label: "5 000 - 10 000 kr" },
  { value: "10000-20000", label: "10 000 - 20 000 kr" },
  { value: "20000-40000", label: "20 000 - 40 000 kr" },
  { value: "40000-60000", label: "40 000 - 60 000 kr" },
  { value: "60000+", label: "Över 60 000 kr" },
  { value: "unsure", label: "Vet inte än" },
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
    industry: "",
    has_domain: null,
    domain_name: "",
    wants_domain_help: null,
    wants_maintenance: null,
    page_count: "",
    has_content: null,
    content_help_needed: "",
    features: [],
    other_features: "",
    design_preferences: "",
    reference_sites: "",
    budget_range: "",
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
          {/* Step 1: Bransch & Domän */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Om er verksamhet</h2>

              <div className="space-y-6">
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
                      <p className="text-xs text-gray-500 mt-1">Vi kan hjälpa er (350 kr/år)</p>
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
                        <p className="text-xs text-gray-500 mt-1">350 kr/år exkl. moms</p>
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
                      <p className="text-xs text-gray-500 mt-1">500 kr/mån exkl. moms</p>
                      <p className="text-xs text-gray-400 mt-0.5">Uppdateringar, säkerhet, support</p>
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

          {/* Step 5: Budget & Tidslinje */}
          {step === 5 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Budget & Tidslinje</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Ungefärlig budget?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {BUDGET_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("budget_range", option.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.budget_range === option.value
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="font-semibold text-gray-900">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

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
