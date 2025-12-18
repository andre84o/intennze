"use client";

import { useState, useEffect } from "react";
import { Quote, QuoteFormData, QuoteItemFormData, Customer } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

interface Props {
  quote: Quote | null;
  customers: Pick<Customer, "id" | "first_name" | "last_name" | "company_name" | "email">[];
  onClose: () => void;
  onSave: (quote: Quote) => void;
}

const emptyItem: QuoteItemFormData = {
  description: "",
  details: "",
  quantity: "1",
  unit: "st",
  unit_price: "",
};

const getInitialFormData = (): QuoteFormData => ({
  customer_id: "",
  title: "",
  description: "",
  valid_from: new Date().toISOString().split("T")[0],
  valid_until: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  vat_rate: "25",
  notes: "",
  terms: "Offerten gäller i 10 dagar från offertdatum.\n\nBetalning: 50% vid start, 50% vid leverans. Betalningsvillkor: 10 dagar netto.\n\nLeverans och tidsplan: Leveransdatum räknas från den dag då första delbetalningen är mottagen och allt nödvändigt material har levererats av Uppdragsgivaren.\n\nFakturering och betalningshantering sker via Utbetalning Sverige AB (org.nr 559484 9407) genom Utbetalning.com. Tjänsten utförs av Intennze Webbstudio.",
  items: [{ ...emptyItem }],
});

export default function QuoteModal({ quote, customers, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<QuoteFormData>(getInitialFormData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quote) {
      setFormData({
        customer_id: quote.customer_id || "",
        title: quote.title,
        description: quote.description || "",
        valid_from: quote.valid_from,
        valid_until: quote.valid_until || "",
        vat_rate: String(quote.vat_rate),
        notes: quote.notes || "",
        terms: quote.terms || "",
        items: quote.items?.map((item) => ({
          id: item.id,
          description: item.description,
          details: item.details || "",
          quantity: String(item.quantity),
          unit: item.unit,
          unit_price: String(item.unit_price),
        })) || [{ ...emptyItem }],
      });
    }
  }, [quote]);

  const calculateItemTotal = (item: QuoteItemFormData): number => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return qty * price;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const vatRate = parseFloat(formData.vat_rate) || 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleItemChange = (index: number, field: keyof QuoteItemFormData, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { ...emptyItem }] });
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const quoteData = {
      customer_id: formData.customer_id || null,
      title: formData.title,
      description: formData.description || null,
      valid_from: formData.valid_from,
      valid_until: formData.valid_until || null,
      vat_rate: parseFloat(formData.vat_rate) || 25,
      subtotal,
      vat_amount: vatAmount,
      total,
      notes: formData.notes || null,
      terms: formData.terms || null,
    };

    try {
      if (quote) {
        // Update existing quote
        const { data: updated, error: updateError } = await supabase
          .from("quotes")
          .update(quoteData)
          .eq("id", quote.id)
          .select("*, customer:customers(*)")
          .single();

        if (updateError) throw updateError;

        // Delete old items and insert new ones
        await supabase.from("quote_items").delete().eq("quote_id", quote.id);

        const itemsToInsert = formData.items
          .filter((item) => item.description && item.unit_price)
          .map((item, index) => ({
            quote_id: quote.id,
            description: item.description,
            details: item.details || null,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || "st",
            unit_price: parseFloat(item.unit_price) || 0,
            total: calculateItemTotal(item),
            sort_order: index,
          }));

        const { data: items } = await supabase
          .from("quote_items")
          .insert(itemsToInsert)
          .select();

        onSave({ ...updated, items: items || [] });
      } else {
        // Create new quote
        const { data: created, error: createError } = await supabase
          .from("quotes")
          .insert(quoteData)
          .select("*, customer:customers(*)")
          .single();

        if (createError) throw createError;

        // Insert items
        const itemsToInsert = formData.items
          .filter((item) => item.description && item.unit_price)
          .map((item, index) => ({
            quote_id: created.id,
            description: item.description,
            details: item.details || null,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || "st",
            unit_price: parseFloat(item.unit_price) || 0,
            total: calculateItemTotal(item),
            sort_order: index,
          }));

        const { data: items } = await supabase
          .from("quote_items")
          .insert(itemsToInsert)
          .select();

        onSave({ ...created, items: items || [] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-900">
          <h2 className="text-xl font-bold text-white">
            {quote ? "Redigera offert" : "Ny offert"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Kund
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Välj kund...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name}
                    {customer.company_name && ` - ${customer.company_name}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Titel *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="T.ex. Webbplats - Företag AB"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Beskrivning
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Kort beskrivning av offerten..."
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Giltig från
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Giltig t.o.m.
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Moms (%)
              </label>
              <input
                type="number"
                value={formData.vat_rate}
                onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Rader</label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                + Lägg till rad
              </button>
            </div>
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                  {/* Title row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Titel / Tjänst *"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Details */}
                  <div className="mb-3">
                    <textarea
                      rows={2}
                      placeholder="Vad ingår? Förklaring..."
                      value={item.details}
                      onChange={(e) => handleItemChange(index, "details", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Price row */}
                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <input
                        type="number"
                        placeholder="Antal"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      />
                    </div>
                    <div className="w-16">
                      <input
                        type="text"
                        placeholder="Enhet"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        placeholder="Á-pris *"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      />
                    </div>
                    <div className="flex-1 text-right">
                      <span className="text-white font-medium">{formatCurrency(calculateItemTotal(item))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (exkl. moms)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Moms ({formData.vat_rate}%)</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-700">
                <span>Totalt (inkl. moms)</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Anteckningar
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Interna anteckningar..."
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Villkor
              </label>
              <textarea
                rows={3}
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Betalningsvillkor etc..."
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Sparar..." : quote ? "Uppdatera" : "Skapa offert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
