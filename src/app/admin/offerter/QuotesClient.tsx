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
  draft: "bg-slate-500",
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

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna offert?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("quotes").delete().eq("id", id);

    if (!error) {
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const handleSendEmail = (quote: Quote) => {
    if (!quote.customer?.email) {
      alert("Kunden har ingen e-postadress registrerad.");
      return;
    }
    setQuoteToSend(quote);
  };

  const confirmSendEmail = async () => {
    if (!quoteToSend) return;
    
    const quote = quoteToSend;
    setSendingId(quote.id);

    try {
      const response = await fetch("/api/quote/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.id }),
      });

      const result = await response.json();

      if (result.ok) {
        // Update local state
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === quote.id
              ? { ...q, status: "sent" as QuoteStatus, sent_at: new Date().toISOString(), sent_to_email: quote.customer?.email || null }
              : q
          )
        );
        setQuoteToSend(null);
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
      <div className="p-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-slate-500 text-sm font-mono">#{quote.quote_number}</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[quote.status]} bg-opacity-20`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusColors[quote.status]}`} />
                {quoteStatusLabels[quote.status]}
              </span>
            </div>
            <h3 className="font-medium text-white">{quote.title}</h3>
            {quote.customer && (
              <p className="text-sm text-cyan-400 mt-1">
                {quote.customer.first_name} {quote.customer.last_name}
                {quote.customer.company_name && ` - ${quote.customer.company_name}`}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <p className="text-lg font-bold text-white">{formatCurrency(quote.total)}</p>
              <p className="text-sm text-slate-500">
                Giltig t.o.m. {quote.valid_until || "—"}
              </p>
            </div>
            {quote.sent_at && (
              <p className="text-xs text-slate-500 mt-2">
                Skickad {new Date(quote.sent_at).toLocaleDateString("sv-SE")} till {quote.sent_to_email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {quote.status === "draft" && quote.customer?.email && (
              <button
                onClick={() => handleSendEmail(quote)}
                disabled={isSending}
                className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
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
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
              title="Redigera"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(quote.id)}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
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
    <div className="text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
            Offerter
          </h1>
          <p className="text-slate-400 mt-1">Skapa och skicka offerter till kunder</p>
        </div>
        <button
          onClick={() => {
            setEditingQuote(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all duration-300"
        >
          + Ny offert
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">Totalt</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">Utkast</p>
          <p className="text-2xl font-bold text-slate-400">{stats.draft}</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">Skickade</p>
          <p className="text-2xl font-bold text-blue-400">{stats.sent}</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm">Accepterade</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalValue)}</p>
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white"
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
        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-xl text-center text-slate-400">
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
    </div>
  );
}
