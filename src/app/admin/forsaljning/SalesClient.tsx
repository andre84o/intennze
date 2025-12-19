"use client";

import { useState } from "react";
import {
  Customer,
  CustomerStatus,
  customerStatusLabels,
  Reminder,
  ReminderType,
  reminderTypeLabels,
  CustomerInteraction,
  InteractionType,
  interactionTypeLabels,
} from "@/types/database";
import { createClient } from "@/utils/supabase/client";

interface Props {
  customers: Customer[];
  reminders: Reminder[];
  interactions: CustomerInteraction[];
  error?: string;
}

const statusColors: Record<CustomerStatus, string> = {
  lead: "bg-slate-500",
  contacted: "bg-blue-500",
  negotiating: "bg-amber-500",
  customer: "bg-green-500",
  churned: "bg-red-500",
};

const typeColors: Record<ReminderType, string> = {
  general: "bg-slate-500",
  follow_up: "bg-blue-500",
  service_update: "bg-purple-500",
  renewal: "bg-amber-500",
  upsell: "bg-green-500",
};

const interactionIcons: Record<InteractionType, string> = {
  call: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
  email: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  meeting: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  note: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  sale: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  other: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default function SalesClient({ customers: initialCustomers, reminders: initialReminders, interactions: initialInteractions, error }: Props) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [reminders, setReminders] = useState(initialReminders);
  const [interactions, setInteractions] = useState(initialInteractions);
  const [filter, setFilter] = useState<CustomerStatus | "all">("all");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState<string | null>(null);
  const [newInteraction, setNewInteraction] = useState<{ customerId: string; type: InteractionType; description: string } | null>(null);
  const [showReminderForm, setShowReminderForm] = useState<string | null>(null);
  const [reminderForm, setReminderForm] = useState({ title: "", date: "", time: "", type: "follow_up" as ReminderType });

  const today = new Date().toISOString().split("T")[0];

  // Filter customers by status
  const filteredCustomers = filter === "all"
    ? customers
    : customers.filter((c) => c.status === filter);

  // Get reminders for a customer
  const getCustomerReminders = (customerId: string) => {
    return reminders
      .filter((r) => r.customer_id === customerId && !r.is_completed)
      .sort((a, b) => a.reminder_date.localeCompare(b.reminder_date));
  };

  // Get next reminder for a customer
  const getNextReminder = (customerId: string) => {
    const customerReminders = getCustomerReminders(customerId);
    return customerReminders[0] || null;
  };

  // Get interactions for a customer
  const getCustomerInteractions = (customerId: string) => {
    return interactions.filter((i) => i.customer_id === customerId).slice(0, 5);
  };

  // Check if customer has overdue reminder
  const hasOverdueReminder = (customerId: string) => {
    return reminders.some((r) => r.customer_id === customerId && !r.is_completed && r.reminder_date < today);
  };

  // Check if customer has reminder today
  const hasTodayReminder = (customerId: string) => {
    return reminders.some((r) => r.customer_id === customerId && !r.is_completed && r.reminder_date === today);
  };

  const handleUpdateCustomer = async (customerId: string, field: string, value: string) => {
    setSavingCustomer(customerId);
    const supabase = createClient();

    // Hämta tidigare status om vi uppdaterar status
    const customer = customers.find((c) => c.id === customerId);
    const previousStatus = customer?.status;

    const { error } = await supabase
      .from("customers")
      .update({ [field]: value })
      .eq("id", customerId);

    if (!error) {
      const updatedCustomer = { ...customer, [field]: value };

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, [field]: value } : c))
      );

      // Skicka till Meta Conversions API vid statusändring
      if (field === "status" && previousStatus !== value) {
        try {
          await fetch("/api/meta/conversion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer: updatedCustomer,
              previousStatus,
            }),
          });
        } catch (e) {
          console.error("Meta conversion error:", e);
        }
      }
    }
    setSavingCustomer(null);
  };

  const handleAddInteraction = async () => {
    if (!newInteraction || !newInteraction.description.trim()) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("customer_interactions")
      .insert({
        customer_id: newInteraction.customerId,
        type: newInteraction.type,
        description: newInteraction.description,
      })
      .select()
      .single();

    if (!error && data) {
      setInteractions((prev) => [data, ...prev]);
      setNewInteraction(null);
    }
  };

  const handleAddReminder = async (customerId: string) => {
    if (!reminderForm.title || !reminderForm.date) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("reminders")
      .insert({
        customer_id: customerId,
        title: reminderForm.title,
        reminder_date: reminderForm.date,
        reminder_time: reminderForm.time || null,
        type: reminderForm.type,
      })
      .select()
      .single();

    if (!error && data) {
      setReminders((prev) => [...prev, data]);
      setShowReminderForm(null);
      setReminderForm({ title: "", date: "", time: "", type: "follow_up" });
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("reminders")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("id", reminderId);

    if (!error) {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminderId ? { ...r, is_completed: true } : r
        )
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Sort customers: overdue first, then today, then by status
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const aOverdue = hasOverdueReminder(a.id);
    const bOverdue = hasOverdueReminder(b.id);
    const aToday = hasTodayReminder(a.id);
    const bToday = hasTodayReminder(b.id);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    return 0;
  });

  const CustomerCard = ({ customer }: { customer: Customer }) => {
    const isExpanded = expandedCustomer === customer.id;
    const customerReminders = getCustomerReminders(customer.id);
    const customerInteractions = getCustomerInteractions(customer.id);
    const nextReminder = getNextReminder(customer.id);
    const isOverdue = hasOverdueReminder(customer.id);
    const isToday = hasTodayReminder(customer.id);

    return (
      <div
        className={`bg-slate-900/50 backdrop-blur-xl border rounded-xl transition-all ${
          isOverdue
            ? "border-red-500/50 bg-red-500/5"
            : isToday
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-slate-800 hover:border-slate-700"
        }`}
      >
        {/* Header - Always visible */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[customer.status]} bg-opacity-20`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColors[customer.status]}`} />
                  {customerStatusLabels[customer.status]}
                </span>
                {isOverdue && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                    Försenad
                  </span>
                )}
                {isToday && !isOverdue && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                    Idag
                  </span>
                )}
              </div>
              <h3 className="font-medium text-white">
                {customer.first_name} {customer.last_name}
              </h3>
              {customer.company_name && (
                <p className="text-sm text-slate-400">{customer.company_name}</p>
              )}
              {nextReminder && (
                <p className="text-sm text-cyan-400 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {nextReminder.title} - {formatDate(nextReminder.reminder_date)}
                  {nextReminder.reminder_time && ` kl ${nextReminder.reminder_time}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isExpanded
                    ? "text-cyan-400 bg-cyan-500/20"
                    : "text-slate-400 hover:text-cyan-400 hover:bg-slate-700"
                }`}
                title="Visa detaljer"
              >
                <svg className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-slate-800 p-4 space-y-4">
            {/* Contact Info + Status */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Kontaktuppgifter
                  </h4>
                  <select
                    value={customer.status}
                    onChange={(e) => handleUpdateCustomer(customer.id, "status", e.target.value)}
                    disabled={savingCustomer === customer.id}
                    className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                  >
                    {Object.entries(customerStatusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500">Förnamn</span>
                    <p className="text-white">{customer.first_name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Efternamn</span>
                    <p className="text-white">{customer.last_name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">E-post</span>
                    <p className="text-white text-sm">{customer.email || "-"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Telefon</span>
                    <p className="text-white">{customer.phone || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="lg:w-48 p-4 bg-slate-800/30 rounded-lg">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Snabbåtgärder</h4>
                <div className="space-y-2">
                  {customer.phone && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons.call} />
                      </svg>
                      Ring
                    </a>
                  )}
                  <button
                    onClick={() => setShowReminderForm(customer.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    Påminnelse
                  </button>
                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons.email} />
                      </svg>
                      Maila
                    </a>
                  )}
                  <button
                    onClick={() => setNewInteraction({ customerId: customer.id, type: "note", description: "" })}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Logga aktivitet
                  </button>
                </div>
              </div>
            </div>

            {/* Önskemål */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Önskemål</label>
              <textarea
                rows={2}
                value={customer.wishes || ""}
                onChange={(e) => handleUpdateCustomer(customer.id, "wishes", e.target.value)}
                disabled={savingCustomer === customer.id}
                placeholder="Vad vill kunden ha?"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 text-sm"
              />
            </div>

            {/* New Interaction Form */}
            {newInteraction && newInteraction.customerId === customer.id && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-purple-400 mb-3">Logga ny aktivitet</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={newInteraction.type}
                    onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value as InteractionType })}
                    className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    {Object.entries(interactionTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newInteraction.description}
                    onChange={(e) => setNewInteraction({ ...newInteraction, description: e.target.value })}
                    placeholder="Beskriv aktiviteten..."
                    className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddInteraction}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                    >
                      Spara
                    </button>
                    <button
                      onClick={() => setNewInteraction(null)}
                      className="px-4 py-2 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors text-sm"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reminders Section */}
            {customerReminders.length > 0 && (
            <div className="p-4 bg-slate-800/30 rounded-lg">
              <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2 mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                Påminnelser ({customerReminders.length})
              </h4>

              {/* Reminder List */}
              <div className="space-y-2">
                {customerReminders.map((reminder) => {
                  const isReminderOverdue = reminder.reminder_date < today;
                  const isReminderToday = reminder.reminder_date === today;
                  return (
                    <div
                      key={reminder.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        isReminderOverdue
                          ? "bg-red-500/10"
                          : isReminderToday
                          ? "bg-amber-500/10"
                          : "bg-slate-700/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${typeColors[reminder.type]}`} />
                        <span className="text-sm text-white">{reminder.title}</span>
                        <span className="text-xs text-slate-500">
                          {formatDate(reminder.reminder_date)}
                          {reminder.reminder_time && ` ${reminder.reminder_time}`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCompleteReminder(reminder.id)}
                        className="p-1 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded transition-colors"
                        title="Markera som klar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Activity History */}
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Senaste aktiviteter
              </h4>
              {customerInteractions.length > 0 ? (
                <div className="space-y-2">
                  {customerInteractions.map((interaction) => (
                    <div
                      key={interaction.id}
                      className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg"
                    >
                      <div className="w-8 h-8 flex items-center justify-center bg-slate-700/50 rounded-lg flex-shrink-0">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons[interaction.type]} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-400">
                            {interactionTypeLabels[interaction.type]}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(interaction.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-white mt-1">{interaction.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Ingen aktivitetshistorik ännu.</p>
              )}
            </div>

            {/* Sales Tips */}
            <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-lg">
              <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Försäljningstips
              </h4>
              <ul className="text-sm text-slate-300 space-y-1">
                {customer.status === "lead" && (
                  <li>• Första kontakt - presentera dig och förstå kundens behov</li>
                )}
                {customer.status === "contacted" && (
                  <li>• Följ upp med mer information eller ett möte</li>
                )}
                {customer.status === "negotiating" && (
                  <li>• Skicka en offert och diskutera villkor</li>
                )}
                {!customer.wishes && (
                  <li>• Fråga om kundens önskemål och behov</li>
                )}
                {customerInteractions.length === 0 && (
                  <li>• Logga din första kontakt för att spåra framsteg</li>
                )}
                {customerReminders.length === 0 && (
                  <li>• Lägg till en påminnelse för uppföljning</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Count customers with issues
  const overdueCount = customers.filter((c) => hasOverdueReminder(c.id)).length;
  const todayCount = customers.filter((c) => hasTodayReminder(c.id) && !hasOverdueReminder(c.id)).length;

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
            Försäljning
          </h1>
          <p className="text-slate-400 mt-1">Hantera leads och kunduppföljning</p>
        </div>
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
              {overdueCount} försenade
            </span>
          )}
          {todayCount > 0 && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
              {todayCount} idag
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white"
          }`}
        >
          Alla ({customers.length})
        </button>
        {Object.entries(customerStatusLabels).map(([key, label]) => {
          const count = customers.filter((c) => c.status === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key as CustomerStatus)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Customer list */}
      <div className="space-y-3">
        {sortedCustomers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>

      {sortedCustomers.length === 0 && (
        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-xl text-center text-slate-400">
          <p>Inga kunder att visa.</p>
          <p className="text-sm mt-2">Lägg till kunder via Kunder-sidan för att börja.</p>
        </div>
      )}

      {/* Reminder Popup Modal */}
      {showReminderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                Ny påminnelse
              </h2>
              <button
                onClick={() => {
                  setShowReminderForm(null);
                  setReminderForm({ title: "", date: "", time: "", type: "follow_up" });
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Titel *</label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  placeholder="T.ex. Ring kunden"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Datum *</label>
                  <input
                    type="date"
                    value={reminderForm.date}
                    onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tid</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="00"
                      maxLength={2}
                      value={reminderForm.time ? reminderForm.time.split(":")[0] : ""}
                      onChange={(e) => {
                        const hour = e.target.value.replace(/\D/g, "");
                        const minute = reminderForm.time?.split(":")[1] || "00";
                        setReminderForm({ ...reminderForm, time: hour ? `${hour}:${minute}` : "" });
                      }}
                      className="w-12 px-2 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-slate-400 font-medium">:</span>
                    <input
                      type="text"
                      placeholder="00"
                      maxLength={2}
                      value={reminderForm.time ? reminderForm.time.split(":")[1] || "" : ""}
                      onChange={(e) => {
                        const minute = e.target.value.replace(/\D/g, "");
                        const hour = reminderForm.time?.split(":")[0] || "00";
                        setReminderForm({ ...reminderForm, time: minute ? `${hour}:${minute}` : "" });
                      }}
                      className="w-12 px-2 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Typ</label>
                <select
                  value={reminderForm.type}
                  onChange={(e) => setReminderForm({ ...reminderForm, type: e.target.value as ReminderType })}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {Object.entries(reminderTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-800 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReminderForm(null);
                  setReminderForm({ title: "", date: "", time: "", type: "follow_up" });
                }}
                className="px-4 py-2 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  handleAddReminder(showReminderForm);
                }}
                disabled={!reminderForm.title || !reminderForm.date}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Spara påminnelse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
