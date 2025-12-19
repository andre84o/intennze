"use client";

import { useState } from "react";
import { Quote, QuoteStatus, quoteStatusLabels, Customer } from "@/types/database";
import QuoteModal from "./QuoteModal";
import SendQuoteModal from "./SendQuoteModal";
import { createClient } from "@/utils/supabase/client";

interface Props {
  initialQuotes: Quote[];
  customers: Pick<Customer, "id" | "first_name" | "last_name" | "company_name" | "email">[];
  error?: string;
}

const statusColors: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
};

const statusDotColors: Record<QuoteStatus, string> = {
  draft: "bg-gray-500",
  sent: "bg-blue-500",
  accepted: "bg-green-500",
  declined: "bg-red-500",
  expired: "bg-amber-500",
};

export default function QuotesClient({ initialQuotes, customers, error }: Props) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [filter, setFilter] = useState<QuoteStatus | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [quoteToSend, setQuoteToSend] = useState<Quote | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);

  const filteredQuotes = filter === "all"
    ? quotes
    : quotes.filter((q) => q.status === filter);

  const handleSave = (savedQuote: Quote) => {
    if (editingQuote) {
      setQuotes((prev) =>
        prev.map((q) => (q.id === savedQuote.id ? savedQuote : q))
      );
    } else {
      setQuotes((prev) => [savedQuote, ...prev]);
    }
    setShowModal(false);
    setEditingQuote(null);
  };

  const handleDelete = (id: string) => {
    setQuoteToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quoteToDelete);

    if (error) {
      console.error("Error deleting quote:", error);
      alert("Kunde inte ta bort offerten");
      return;
    }

    setQuotes((prev) => prev.filter((q) => q.id !== quoteToDelete));
    setShowDeleteModal(false);
    setQuoteToDelete(null);
  };

  const handleSendEmail = (quote: Quote) => {
    setQuoteToSend(quote);
  };

  const confirmSendEmail = async (email: string, message: string) => {
    if (!quoteToSend) return;
    
    setSendingId(quoteToSend.id);
    setQuoteToSend(null); // Close modal immediately

    try {
      const response = await fetch("/api/quote/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quoteToSend.id,
          email,
          message,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update status locally
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === quoteToSend.id
              ? { ...q, status: "sent", sent_at: new Date().toISOString(), sent_to_email: email }
              : q
          )
        );
        // Optional: Show success toast instead of alert
      } else {
        alert(`Fel: ${result.error || "Kunde inte skicka offerten"}`);
      }
    } catch {
      alert("Ett fel uppstod vid skickande av offert.");
    } finally {
      setSendingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const QuoteCard = ({ quote }: { quote: Quote }) => {
    const isSending = sendingId === quote.id;

    return (
      <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-500 text-sm font-mono">#{quote.quote_number}</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[quote.status]}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotColors[quote.status]}`} />
                {quoteStatusLabels[quote.status]}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">{quote.title}</h3>
            {quote.customer && (
              <p className="text-sm text-blue-600 mt-1 font-medium">
                {quote.customer.first_name} {quote.customer.last_name}
                {quote.customer.company_name && ` - ${quote.customer.company_name}`}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(quote.total)}</p>
              <p className="text-sm text-gray-500">
                Giltig t.o.m. {quote.valid_until || "—"}
              </p>
            </div>
            {quote.sent_at && (
              <p className="text-xs text-gray-500 mt-2">
                Skickad {new Date(quote.sent_at).toLocaleDateString("sv-SE")} till {quote.sent_to_email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {quote.status === "draft" && quote.customer?.email && (
              <button
                onClick={() => handleSendEmail(quote)}
                disabled={isSending}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                title="Skicka via e-post"
              >
                {isSending ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={() => {
                setEditingQuote(quote);
                setShowModal(true);
              }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Redigera"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(quote.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Ta bort"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Stats
  const stats = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "draft").length,
    sent: quotes.filter((q) => q.status === "sent").length,
    accepted: quotes.filter((q) => q.status === "accepted").length,
    totalValue: quotes.filter((q) => q.status === "accepted").reduce((sum, q) => sum + q.total, 0),
  };

  return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Offerter
          </h1>
          <p className="text-gray-500 mt-1">Skapa och skicka offerter till kunder</p>
        </div>
        <button
          onClick={() => {
            setEditingQuote(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow"
        >
          + Ny offert
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Totalt</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Utkast</p>
          <p className="text-2xl font-bold text-gray-700">{stats.draft}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Skickade</p>
          <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Accepterade</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "all", label: "Alla" },
          { key: "draft", label: "Utkast" },
          { key: "sent", label: "Skickade" },
          { key: "accepted", label: "Accepterade" },
          { key: "declined", label: "Avböjda" },
          { key: "expired", label: "Utgångna" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as QuoteStatus | "all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              filter === tab.key
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quotes list */}
      <div className="space-y-3">
        {filteredQuotes.map((quote) => (
          <QuoteCard key={quote.id} quote={quote} />
        ))}
      </div>

      {filteredQuotes.length === 0 && (
        <div className="p-8 bg-white border border-gray-200 rounded-xl text-center text-gray-500">
          Inga offerter att visa.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <QuoteModal
          quote={editingQuote}
          customers={customers}
          onClose={() => {
            setShowModal(false);
            setEditingQuote(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Send Modal */}
      {quoteToSend && (
        <SendQuoteModal
          quote={quoteToSend}
          onClose={() => setQuoteToSend(null)}
          onConfirm={confirmSendEmail}
          isSending={!!sendingId}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ta bort offert</h3>
            <p className="text-gray-500 mb-6">
              Är du säker på att du vill ta bort denna offert? Detta går inte att ångra.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setQuoteToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
