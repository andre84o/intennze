"use client";

import { useState } from "react";
import { Reminder, ReminderFormData, ReminderType, RecurringInterval, reminderTypeLabels, Customer } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

interface Props {
  reminder: Reminder | null;
  customers: Pick<Customer, "id" | "first_name" | "last_name" | "company_name">[];
  onClose: () => void;
  onSave: (reminder: Reminder) => void;
}

const initialFormData: ReminderFormData = {
  customer_id: "",
  title: "",
  description: "",
  reminder_date: new Date().toISOString().split("T")[0],
  reminder_time: "",
  type: "general",
  is_recurring: false,
  recurring_interval: "",
};

export default function ReminderModal({ reminder, customers, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<ReminderFormData>(
    reminder
      ? {
          customer_id: reminder.customer_id || "",
          title: reminder.title,
          description: reminder.description || "",
          reminder_date: reminder.reminder_date,
          reminder_time: reminder.reminder_time || "",
          type: reminder.type,
          is_recurring: reminder.is_recurring,
          recurring_interval: reminder.recurring_interval || "",
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
      customer_id: formData.customer_id || null,
      title: formData.title,
      description: formData.description || null,
      reminder_date: formData.reminder_date,
      reminder_time: formData.reminder_time || null,
      type: formData.type,
      is_recurring: formData.is_recurring,
      recurring_interval: formData.is_recurring ? formData.recurring_interval || null : null,
    };

    if (reminder) {
      const { data: updated, error } = await supabase
        .from("reminders")
        .update(data)
        .eq("id", reminder.id)
        .select("*, customer:customers(*)")
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      onSave(updated);
    } else {
      const { data: created, error } = await supabase
        .from("reminders")
        .insert(data)
        .select("*, customer:customers(*)")
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
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {reminder ? "Redigera påminnelse" : "Ny påminnelse"}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Kund (valfritt)
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Ingen kund vald</option>
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
              placeholder="T.ex. Ring upp kund, Uppdatera WordPress..."
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Beskrivning
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Datum *
              </label>
              <input
                type="date"
                required
                value={formData.reminder_date}
                onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Tid
              </label>
              <input
                type="time"
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Typ
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ReminderType })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {Object.entries(reminderTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-300">Återkommande påminnelse</span>
            </label>

            {formData.is_recurring && (
              <div className="pl-6">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Intervall
                </label>
                <select
                  value={formData.recurring_interval}
                  onChange={(e) => setFormData({ ...formData, recurring_interval: e.target.value as RecurringInterval })}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Välj intervall</option>
                  <option value="weekly">Varje vecka</option>
                  <option value="monthly">Varje månad</option>
                  <option value="quarterly">Varje kvartal</option>
                  <option value="yearly">Varje år</option>
                </select>
              </div>
            )}
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
              {loading ? "Sparar..." : reminder ? "Uppdatera" : "Skapa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
