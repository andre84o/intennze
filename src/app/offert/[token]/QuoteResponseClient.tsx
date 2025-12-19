"use client";

import { useState } from "react";
import { Quote, QuoteItem } from "@/types/database";

interface QuoteWithDetails extends Omit<Quote, 'customer'> {
  customer?: {
    first_name: string;
    last_name: string;
    company_name: string | null;
    email: string | null;
  } | null;
  items?: QuoteItem[];
}

interface Props {
  quote: QuoteWithDetails;
  token: string;
}

export default function QuoteResponseClient({ quote: initialQuote, token }: Props) {
  const [quote, setQuote] = useState(initialQuote);
  const [loading, setLoading] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [responded, setResponded] = useState(
    quote.status === "accepted" || quote.status === "declined"
  );

  const handleResponse = async (accept: boolean) => {
    setLoading(true);

    try {
      const response = await fetch("/api/quotes/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          accept,
          note: responseNote,
        }),
      });

      if (response.ok) {
        setQuote((prev) => ({
          ...prev,
          status: accept ? "accepted" : "declined",
          customer_response_at: new Date().toISOString(),
          customer_response_note: responseNote || null,
        }));
        setResponded(true);
      }
    } catch (error) {
      console.error("Error responding to quote:", error);
    }

    setLoading(false);
  };

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">i</span>
            </div>
            <span className="font-bold text-xl text-gray-900">intenzze</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Offert #{quote.quote_number}</h1>
          <p className="text-gray-500">{quote.title}</p>
        </div>

        {/* Status banner */}
        {responded && (
          <div
            className={`mb-6 p-4 rounded-xl text-center ${
              quote.status === "accepted"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            <p className="font-semibold text-lg">
              {quote.status === "accepted" ? "✓ Offerten är godkänd" : "✗ Offerten är avböjd"}
            </p>
            {quote.customer_response_at && (
              <p className="text-sm mt-1">
                Svarad {new Date(quote.customer_response_at).toLocaleDateString("sv-SE")}
              </p>
            )}
          </div>
        )}

        {isExpired && !responded && (
          <div className="mb-6 p-4 rounded-xl text-center bg-amber-50 border border-amber-200 text-amber-700">
            <p className="font-semibold">Denna offert har gått ut</p>
            <p className="text-sm mt-1">Giltig till: {quote.valid_until}</p>
          </div>
        )}

        {/* Quote details */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Customer info */}
          {quote.customer && (
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500 mb-1">Till:</p>
              <p className="font-semibold text-gray-900">
                {quote.customer.first_name} {quote.customer.last_name}
              </p>
              {quote.customer.company_name && (
                <p className="text-gray-600">{quote.customer.company_name}</p>
              )}
            </div>
          )}

          {/* Description */}
          {quote.description && (
            <div className="p-6 border-b border-gray-100">
              <p className="text-gray-600 whitespace-pre-wrap">{quote.description}</p>
            </div>
          )}

          {/* Items */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Specifikation</h3>
            <div className="space-y-3">
              {quote.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.description}</p>
                    {item.details && (
                      <p className="text-sm text-gray-500 mt-1">{item.details}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {item.quantity} {item.unit} × {Number(item.unit_price).toLocaleString("sv-SE")} kr
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 whitespace-nowrap">
                    {Number(item.total).toLocaleString("sv-SE")} kr
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Summa exkl. moms</span>
                <span>{Number(quote.subtotal).toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Moms ({quote.vat_rate}%)</span>
                <span>{Number(quote.vat_amount).toLocaleString("sv-SE")} kr</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
                <span>Totalt</span>
                <span>{Number(quote.total).toLocaleString("sv-SE")} kr</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          {quote.terms && (
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-2">Villkor</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.terms}</p>
            </div>
          )}

          {/* Valid until */}
          <div className="p-6 border-t border-gray-100 text-center text-sm text-gray-500">
            {quote.valid_until
              ? `Giltig till ${new Date(quote.valid_until).toLocaleDateString("sv-SE")}`
              : "Ingen utgångsdatum"}
          </div>
        </div>

        {/* Response buttons */}
        {!responded && !isExpired && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">Vad vill du göra?</h3>

            {showNoteField && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meddelande (valfritt)
                </label>
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="Lägg till ett meddelande..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {!showNoteField ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowNoteField(true);
                  }}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-lg"
                >
                  ✓ Godkänn offert
                </button>
                <button
                  onClick={() => {
                    setShowNoteField(true);
                  }}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50 border border-gray-300 text-lg"
                >
                  ✗ Avböj offert
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleResponse(true)}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? "Skickar..." : "✓ Bekräfta godkännande"}
                </button>
                <button
                  onClick={() => handleResponse(false)}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? "Skickar..." : "✗ Bekräfta avböjande"}
                </button>
              </div>
            )}

            {showNoteField && (
              <button
                onClick={() => setShowNoteField(false)}
                className="w-full mt-3 px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Tillbaka
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Offert från intenzze</p>
        </div>
      </div>
    </div>
  );
}
