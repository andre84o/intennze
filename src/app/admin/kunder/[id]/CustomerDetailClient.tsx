"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Customer,
  CustomerInteraction,
  Purchase,
  Reminder,
  Quote,
  CustomerStatus,
  customerStatusLabels,
  interactionTypeLabels,
  quoteStatusLabels,
  InteractionType,
} from "@/types/database";

interface Props {
  customer: Customer;
  interactions: CustomerInteraction[];
  purchases: Purchase[];
  reminders: Reminder[];
  quotes: Quote[];
}

const statusColors: Record<CustomerStatus, string> = {
  lead: "bg-slate-500",
  contacted: "bg-blue-500",
  negotiating: "bg-yellow-500",
  customer: "bg-green-500",
  churned: "bg-red-500",
};

export default function CustomerDetailClient({
  customer: initialCustomer,
  interactions: initialInteractions,
  purchases,
  reminders,
  quotes,
}: Props) {
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);
  const [interactions, setInteractions] = useState(initialInteractions);
  const [saving, setSaving] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: "note" as InteractionType,
    description: "",
  });

  const handleUpdateStatus = async (status: CustomerStatus) => {
    setSaving(true);
    const supabase = createClient();
    const previousStatus = customer.status;

    const { error } = await supabase
      .from("customers")
      .update({ status })
      .eq("id", customer.id);

    if (!error) {
      setCustomer((prev) => ({ ...prev, status }));

      // Send to Meta Conversions API
      if (previousStatus !== status) {
        try {
          await fetch("/api/meta/conversion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer: { ...customer, status },
              previousStatus,
            }),
          });
        } catch (e) {
          console.error("Meta conversion error:", e);
        }
      }
    }
    setSaving(false);
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInteraction.description.trim()) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customer_interactions")
      .insert({
        customer_id: customer.id,
        type: newInteraction.type,
        description: newInteraction.description,
      })
      .select()
      .single();

    if (!error && data) {
      setInteractions((prev) => [data, ...prev]);
      setNewInteraction({ type: "note", description: "" });
      setShowInteractionForm(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Är du säker på att du vill radera denna kund?")) return;

    const supabase = createClient();
    await supabase.from("customers").delete().eq("id", customer.id);
    router.push("/admin/kunder");
  };

  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/kunder"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {customer.first_name} {customer.last_name}
            </h1>
            {customer.company_name && (
              <p className="text-slate-400">{customer.company_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={customer.status}
            onChange={(e) => handleUpdateStatus(e.target.value as CustomerStatus)}
            disabled={saving}
            className={`px-3 py-2 rounded-lg text-white text-sm font-medium ${statusColors[customer.status]} border-0 focus:outline-none focus:ring-2 focus:ring-white/20`}
          >
            {Object.entries(customerStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={handleDelete}
            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Radera kund"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Customer info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact info */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Kontaktuppgifter</h2>
            <div className="space-y-4">
              {customer.email && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">E-post</label>
                  <a href={`mailto:${customer.email}`} className="block text-cyan-400 hover:text-cyan-300">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Telefon</label>
                  <a href={`tel:${customer.phone}`} className="block text-cyan-400 hover:text-cyan-300">
                    {customer.phone}
                  </a>
                </div>
              )}
              {(customer.address || customer.city) && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Adress</label>
                  <p className="text-white">
                    {customer.address}
                    {customer.postal_code && `, ${customer.postal_code}`}
                    {customer.city && ` ${customer.city}`}
                  </p>
                </div>
              )}
              {customer.org_number && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Org.nummer</label>
                  <p className="text-white">{customer.org_number}</p>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="mt-6 pt-6 border-t border-slate-800 flex gap-2">
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-center text-sm transition-colors"
                >
                  Ring
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-center text-sm transition-colors"
                >
                  Maila
                </a>
              )}
            </div>
          </div>

          {/* Notes / wishes */}
          {customer.wishes && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Önskemål</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{customer.wishes}</p>
            </div>
          )}

          {/* Stats */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Statistik</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{purchases.length}</p>
                <p className="text-xs text-slate-400">Köp</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{totalPurchases.toLocaleString("sv-SE")} kr</p>
                <p className="text-xs text-slate-400">Totalt</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{quotes.length}</p>
                <p className="text-xs text-slate-400">Offerter</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{interactions.length}</p>
                <p className="text-xs text-slate-400">Interaktioner</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interaction form */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Aktivitetslogg</h2>
              <button
                onClick={() => setShowInteractionForm(!showInteractionForm)}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
              >
                + Logga aktivitet
              </button>
            </div>

            {showInteractionForm && (
              <form onSubmit={handleAddInteraction} className="mb-6 p-4 bg-slate-800/50 rounded-lg">
                <div className="flex gap-3 mb-3">
                  <select
                    value={newInteraction.type}
                    onChange={(e) => setNewInteraction((prev) => ({ ...prev, type: e.target.value as InteractionType }))}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    {Object.entries(interactionTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={newInteraction.description}
                  onChange={(e) => setNewInteraction((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Beskriv aktiviteten..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 mb-3"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInteractionForm(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  >
                    Spara
                  </button>
                </div>
              </form>
            )}

            {/* Interaction list */}
            {interactions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Inga aktiviteter ännu</p>
            ) : (
              <div className="space-y-3">
                {interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="flex gap-3 p-3 bg-slate-800/30 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-slate-400">
                        {interactionTypeLabels[interaction.type]?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {interactionTypeLabels[interaction.type]}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(interaction.created_at).toLocaleString("sv-SE")}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{interaction.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reminders */}
          {reminders.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Påminnelser</h2>
              <div className="space-y-2">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      reminder.is_completed
                        ? "bg-slate-800/30 opacity-60"
                        : "bg-amber-500/10 border border-amber-500/30"
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${reminder.is_completed ? "text-slate-400 line-through" : "text-white"}`}>
                        {reminder.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {reminder.reminder_date} {reminder.reminder_time || ""}
                      </p>
                    </div>
                    {reminder.is_completed && (
                      <span className="text-green-400 text-sm">Klar</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quotes */}
          {quotes.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Offerter</h2>
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/admin/offerter/${quote.id}`}
                    className="block p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{quote.title}</p>
                        <p className="text-sm text-slate-500">#{quote.quote_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">
                          {quote.total.toLocaleString("sv-SE")} kr
                        </p>
                        <span className="text-xs text-slate-400">
                          {quoteStatusLabels[quote.status]}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
