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

// Facebook-ikon SVG
const FacebookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
import { createClient } from "@/utils/supabase/client";

interface Questionnaire {
  id: string;
  customer_id: string;
  status: string;
}

interface Props {
  customers: Customer[];
  reminders: Reminder[];
  interactions: CustomerInteraction[];
  questionnaires: Questionnaire[];
  error?: string;
}

const statusColors: Record<CustomerStatus, string> = {
  lead: "bg-gray-500 text-white",
  contacted: "bg-blue-500 text-white",
  negotiating: "bg-amber-500 text-white",
  customer: "bg-green-500 text-white",
  churned: "bg-red-500 text-white",
};

const statusBadges: Record<CustomerStatus, string> = {
  lead: "bg-gray-100 text-gray-700 border-gray-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  negotiating: "bg-amber-50 text-amber-700 border-amber-200",
  customer: "bg-green-50 text-green-700 border-green-200",
  churned: "bg-red-50 text-red-700 border-red-200",
};

const typeColors: Record<ReminderType, string> = {
  general: "bg-gray-500",
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

// Props interface for CustomerCard - moved outside to prevent focus loss
interface CustomerCardProps {
  customer: Customer;
  expandedCustomer: string | null;
  setExpandedCustomer: (id: string | null) => void;
  savingCustomer: string | null;
  newInteraction: { customerId: string; type: InteractionType; description: string } | null;
  setNewInteraction: (value: { customerId: string; type: InteractionType; description: string } | null) => void;
  showReminderForm: string | null;
  setShowReminderForm: (id: string | null) => void;
  reminderForm: { title: string; date: string; time: string; type: ReminderType };
  setReminderForm: (form: { title: string; date: string; time: string; type: ReminderType }) => void;
  sendingQuestionnaire: string | null;
  today: string;
  getCustomerReminders: (customerId: string) => Reminder[];
  getCustomerInteractions: (customerId: string) => CustomerInteraction[];
  getNextReminder: (customerId: string) => Reminder | null;
  hasOverdueReminder: (customerId: string) => boolean;
  hasTodayReminder: (customerId: string) => boolean;
  hasQuestionnaire: (customerId: string) => boolean;
  handleUpdateCustomer: (customerId: string, field: string, value: string) => void;
  handleUpdateCustomerBoolean: (customerId: string, field: string, value: boolean) => void;
  markCustomerAsRead: (customerId: string) => void;
  handleAddInteraction: () => void;
  handleAddReminder: (customerId: string) => void;
  handleCompleteReminder: (reminderId: string) => void;
  handleSendQuestionnaire: (customerId: string) => void;
  handleViewResponses: (customerId: string) => void;
  formatDate: (dateString: string) => string;
  formatDateTime: (dateString: string) => string;
}

// CustomerCard component - defined outside to prevent focus loss on re-render
const CustomerCard = ({
  customer,
  expandedCustomer,
  setExpandedCustomer,
  savingCustomer,
  newInteraction,
  setNewInteraction,
  showReminderForm,
  setShowReminderForm,
  reminderForm,
  setReminderForm,
  sendingQuestionnaire,
  today,
  getCustomerReminders,
  getCustomerInteractions,
  getNextReminder,
  hasOverdueReminder,
  hasTodayReminder,
  hasQuestionnaire,
  handleUpdateCustomer,
  handleUpdateCustomerBoolean,
  markCustomerAsRead,
  handleAddInteraction,
  handleAddReminder,
  handleCompleteReminder,
  handleSendQuestionnaire,
  handleViewResponses,
  formatDate,
  formatDateTime,
}: CustomerCardProps) => {
  const isExpanded = expandedCustomer === customer.id;
  const customerReminders = getCustomerReminders(customer.id);
  const customerInteractions = getCustomerInteractions(customer.id);
  const nextReminder = getNextReminder(customer.id);
  const isOverdue = hasOverdueReminder(customer.id);
  const isToday = hasTodayReminder(customer.id);
  const serviceExpired = isServiceExpired(customer);

  // Local state for wishes textarea to prevent focus loss on each keystroke
  const [localWishes, setLocalWishes] = useState(customer.wishes || "");

  return (
    <div
      className={`bg-white border rounded-xl transition-all shadow-sm hover:shadow-md ${
        serviceExpired
          ? "border-red-300 bg-red-50 ring-2 ring-red-200"
          : isOverdue
          ? "border-red-200 bg-red-50"
          : isToday
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => {
          if (!isExpanded) {
            markCustomerAsRead(customer.id);
          }
          setExpandedCustomer(isExpanded ? null : customer.id);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadges[customer.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusColors[customer.status].split(' ')[0]}`} />
                {customerStatusLabels[customer.status]}
              </span>
              {serviceExpired && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Utgånget avtal
                </span>
              )}
              {isOverdue && !serviceExpired && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                  Försenad
                </span>
              )}
              {isToday && !isOverdue && !serviceExpired && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  Idag
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
              {customer.first_name} {customer.last_name}
              {!customer.is_read && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" title="Ny lead" />
              )}
            </h3>
            {customer.company_name && (
              <p className="text-sm text-gray-500">{customer.company_name}</p>
            )}
            {nextReminder && (
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-1.5 font-medium">
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
              onClick={(e) => {
                e.stopPropagation();
                setExpandedCustomer(isExpanded ? null : customer.id);
              }}
              className={`p-2 rounded-lg transition-colors ${
                isExpanded
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-400 hover:text-blue-600 hover:bg-gray-100"
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
        <div className="border-t border-gray-100 p-4 space-y-6 bg-gray-50/50 rounded-b-xl">
          {/* Contact Info + Status */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Kontaktuppgifter
                </h4>
                <select
                  value={customer.status}
                  onChange={(e) => handleUpdateCustomer(customer.id, "status", e.target.value)}
                  disabled={savingCustomer === customer.id}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 shadow-sm"
                >
                  {Object.entries(customerStatusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Förnamn</span>
                  <p className="text-gray-900 font-medium">{customer.first_name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Efternamn</span>
                  <p className="text-gray-900 font-medium">{customer.last_name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">E-post</span>
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className="text-gray-900 text-sm break-all hover:text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  ) : (
                    <p className="text-gray-900 text-sm">-</p>
                  )}
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</span>
                  {customer.phone ? (
                    <a href={`tel:${customer.phone}`} className="text-gray-900 hover:text-blue-600 hover:underline">
                      {customer.phone}
                    </a>
                  ) : (
                    <p className="text-gray-900">-</p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customer.has_service_agreement}
                    onChange={(e) => handleUpdateCustomerBoolean(customer.id, "has_service_agreement", e.target.checked)}
                    disabled={savingCustomer === customer.id}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">Har serviceavtal</span>
                  {customer.has_service_agreement && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Aktiv</span>
                  )}
                </label>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:w-56 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Snabbåtgärder</h4>
              <div className="space-y-2.5">
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-2.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons.call} />
                    </svg>
                    Ring
                  </a>
                )}
                <button
                  onClick={() => setShowReminderForm(customer.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  Påminnelse
                </button>
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-2.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons.email} />
                    </svg>
                    Maila
                  </a>
                )}
                <button
                  onClick={() => setNewInteraction({ customerId: customer.id, type: "note", description: "" })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Logga aktivitet
                </button>
                {customer.email && (
                  <button
                    onClick={() => handleSendQuestionnaire(customer.id)}
                    disabled={sendingQuestionnaire === customer.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                    {sendingQuestionnaire === customer.id ? "Skickar..." : "Skicka formulär"}
                  </button>
                )}
                {hasQuestionnaire(customer.id) && (
                  <button
                    onClick={() => handleViewResponses(customer.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Se formulärsvar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Önskemål */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Önskemål</label>
            <textarea
              rows={2}
              value={localWishes}
              onChange={(e) => setLocalWishes(e.target.value)}
              onBlur={(e) => {
                if (e.target.value !== customer.wishes) {
                  handleUpdateCustomer(customer.id, "wishes", e.target.value);
                }
              }}
              disabled={savingCustomer === customer.id}
              placeholder="Vad vill kunden ha?"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 text-sm shadow-sm"
            />
          </div>

          {/* New Interaction Form */}
          {newInteraction && newInteraction.customerId === customer.id && (
            <div className="p-5 bg-purple-50 border border-purple-200 rounded-xl shadow-sm">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">Logga ny aktivitet</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={newInteraction.type}
                  onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value as InteractionType })}
                  className="px-3 py-2 bg-white border border-purple-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
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
                  className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddInteraction}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
                  >
                    Spara
                  </button>
                  <button
                    onClick={() => setNewInteraction(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reminders Section */}
          {customerReminders.length > 0 && (
          <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
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
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isReminderOverdue
                        ? "bg-red-50 border-red-100"
                        : isReminderToday
                        ? "bg-amber-50 border-amber-100"
                        : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${typeColors[reminder.type]}`} />
                      <span className="text-sm font-medium text-gray-900">{reminder.title}</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(reminder.reminder_date)}
                        {reminder.reminder_time && ` ${reminder.reminder_time}`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCompleteReminder(reminder.id)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      title="Markera som klar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
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
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Senaste aktiviteter
            </h4>
            {customerInteractions.length > 0 ? (
              <div className="space-y-3">
                {customerInteractions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full flex-shrink-0 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons[interaction.type]} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {interactionTypeLabels[interaction.type]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(interaction.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{interaction.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Ingen aktivitetshistorik ännu.</p>
            )}
          </div>

          {/* Sales Tips */}
          <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              Försäljningstips
            </h4>
            <ul className="text-sm text-blue-700 space-y-1.5 list-disc list-inside">
              {customer.status === "lead" && (
                <li>Första kontakt - presentera dig och förstå kundens behov</li>
              )}
              {customer.status === "contacted" && (
                <li>Följ upp med mer information eller ett möte</li>
              )}
              {customer.status === "negotiating" && (
                <li>Skicka en offert och diskutera villkor</li>
              )}
              {!customer.wishes && (
                <li>Fråga om kundens önskemål och behov</li>
              )}
              {customerInteractions.length === 0 && (
                <li>Logga din första kontakt för att spåra framsteg</li>
              )}
              {customerReminders.length === 0 && (
                <li>Lägg till en påminnelse för uppföljning</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Check if service agreement has expired
const isServiceExpired = (customer: Customer) => {
  if (!customer.has_service_agreement || !customer.service_renewal_date) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewalDate = new Date(customer.service_renewal_date);
  renewalDate.setHours(0, 0, 0, 0);
  return renewalDate < today;
};

export default function SalesClient({ customers: initialCustomers, reminders: initialReminders, interactions: initialInteractions, questionnaires: initialQuestionnaires, error }: Props) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [reminders, setReminders] = useState(initialReminders);
  const [interactions, setInteractions] = useState(initialInteractions);
  const [questionnaires, setQuestionnaires] = useState(initialQuestionnaires);
  const [filter, setFilter] = useState<CustomerStatus | "all">("all");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState<string | null>(null);
  const [newInteraction, setNewInteraction] = useState<{ customerId: string; type: InteractionType; description: string } | null>(null);
  const [showReminderForm, setShowReminderForm] = useState<string | null>(null);
  const [reminderForm, setReminderForm] = useState({ title: "", date: "", time: "", type: "follow_up" as ReminderType });
  const [sendingQuestionnaire, setSendingQuestionnaire] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState<{ show: boolean; email?: string }>({ show: false });
  const [showResponsesPopup, setShowResponsesPopup] = useState<string | null>(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<Record<string, unknown> | null>(null);
  const [showAllRemindersPopup, setShowAllRemindersPopup] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [showQuestionsHelper, setShowQuestionsHelper] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Send questionnaire to customer
  const handleSendQuestionnaire = async (customerId: string) => {
    setSendingQuestionnaire(customerId);
    const customer = customers.find(c => c.id === customerId);
    try {
      const response = await fetch("/api/questionnaire/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      const result = await response.json();

      if (response.ok) {
        // Add the new questionnaire to state so the button appears immediately
        if (result.questionnaireId) {
          setQuestionnaires((prev) => [...prev, { id: result.questionnaireId, customer_id: customerId, status: "sent" }]);
        }
        setShowSuccessPopup({ show: true, email: customer?.email || undefined });
        setTimeout(() => setShowSuccessPopup({ show: false }), 4000);
      } else {
        alert(`Fel: ${result.error || "Kunde inte skicka formuläret"}`);
      }
    } catch {
      alert("Ett fel uppstod vid skickande av formulär.");
    } finally {
      setSendingQuestionnaire(null);
    }
  };

  // Fetch questionnaire responses for a customer
  const handleViewResponses = async (customerId: string) => {
    setShowResponsesPopup(customerId);
    setLoadingResponses(true);
    setQuestionnaireResponses(null);

    const supabase = createClient();

    // First get the questionnaire for this customer
    const { data: questionnaire } = await supabase
      .from("questionnaires")
      .select("id, status, sent_at, completed_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (questionnaire) {
      // Then get the responses
      const { data: responses } = await supabase
        .from("questionnaire_responses")
        .select("*")
        .eq("questionnaire_id", questionnaire.id)
        .single();

      setQuestionnaireResponses({
        ...responses,
        questionnaire_status: questionnaire.status,
        sent_at: questionnaire.sent_at,
        completed_at: questionnaire.completed_at,
      });
    }

    setLoadingResponses(false);
  };

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

  // Check if customer has a questionnaire sent
  const hasQuestionnaire = (customerId: string) => {
    return questionnaires.some((q) => q.customer_id === customerId);
  };

  const handleUpdateCustomerBoolean = async (customerId: string, field: string, value: boolean) => {
    setSavingCustomer(customerId);
    const supabase = createClient();

    const { error } = await supabase
      .from("customers")
      .update({ [field]: value })
      .eq("id", customerId);

    if (!error) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, [field]: value } : c))
      );
    }
    setSavingCustomer(null);
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

  // Markera kund som läst
  const markCustomerAsRead = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer && !customer.is_read) {
      const supabase = createClient();
      await supabase
        .from("customers")
        .update({ is_read: true })
        .eq("id", customerId);

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, is_read: true } : c))
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

  // Sort customers: expired service first, then overdue reminders, then today
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const aExpired = isServiceExpired(a);
    const bExpired = isServiceExpired(b);
    const aOverdue = hasOverdueReminder(a.id);
    const bOverdue = hasOverdueReminder(b.id);
    const aToday = hasTodayReminder(a.id);
    const bToday = hasTodayReminder(b.id);

    // Expired service agreements first
    if (aExpired && !bExpired) return -1;
    if (!aExpired && bExpired) return 1;
    // Then overdue reminders
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    // Then today's reminders
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    return 0;
  });

  // Count customers with issues
  const expiredServiceCount = customers.filter((c) => isServiceExpired(c)).length;
  const overdueCount = customers.filter((c) => hasOverdueReminder(c.id)).length;
  const todayCount = customers.filter((c) => hasTodayReminder(c.id) && !hasOverdueReminder(c.id)).length;

  return (
    <div className="bg-gray-50 min-h-screen -m-3 sm:-m-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Försäljning
          </h1>
          <p className="text-gray-500 mt-1 text-lg">Hantera leads och kunduppföljning</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQuestionsHelper(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            Formulärfrågor
          </button>
          {expiredServiceCount > 0 && (
            <span className="px-4 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-sm font-medium shadow-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {expiredServiceCount} utgångna avtal
            </span>
          )}
          {overdueCount > 0 && (
            <span className="px-4 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-sm font-medium shadow-sm">
              {overdueCount} försenade
            </span>
          )}
          {todayCount > 0 && (
            <span className="px-4 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-sm font-medium shadow-sm">
              {todayCount} idag
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Totalt</p>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Leads</p>
          <p className="text-2xl font-bold text-blue-600">{customers.filter((c) => c.status === "lead").length}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Kunder</p>
          <p className="text-2xl font-bold text-green-600">{customers.filter((c) => c.status === "customer").length}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Serviceavtal</p>
          <p className="text-2xl font-bold text-purple-600">{customers.filter((c) => c.has_service_agreement).length}</p>
        </div>
        {customers.filter((c) => isServiceExpired(c)).length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <p className="text-red-600 text-sm">Utgångna avtal</p>
            <p className="text-2xl font-bold text-red-600">{customers.filter((c) => isServiceExpired(c)).length}</p>
          </div>
        )}
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <FacebookIcon />
            <span>Facebook Ads</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{customers.filter((c) => c.source === "facebook_ads").length}</p>
        </div>
      </div>

      {/* Upcoming reminders */}
      {reminders.filter((r) => !r.is_completed && r.reminder_date >= today).length > 0 && (
        <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Kommande påminnelser
            </h3>
            <button
              onClick={() => setShowAllRemindersPopup(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Visa alla
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {reminders
              .filter((r) => !r.is_completed && r.reminder_date >= today)
              .sort((a, b) => a.reminder_date.localeCompare(b.reminder_date))
              .slice(0, 5)
              .map((reminder) => {
                const customer = customers.find((c) => c.id === reminder.customer_id);
                const isToday = reminder.reminder_date === today;
                
                return (
                  <div 
                    key={reminder.id} 
                    className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                      isToday ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColors[reminder.type]}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {reminder.title}
                        </p>
                        {customer && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {customer.first_name} {customer.last_name} • {customer.company_name || "Privatperson"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`text-sm font-medium ${
                        isToday ? "text-amber-600" : "text-gray-500"
                      }`}>
                        {isToday ? "Idag" : formatDate(reminder.reminder_date)}
                        {reminder.reminder_time && <span className="text-gray-400 font-normal ml-1">kl {reminder.reminder_time}</span>}
                      </div>
                      <button
                        onClick={() => handleCompleteReminder(reminder.id)}
                        className="p-1.5 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="Markera som klar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setFilter("all")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
            filter === "all"
              ? "bg-white text-blue-600 border border-blue-200 ring-2 ring-blue-100"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900"
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
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                filter === key
                  ? "bg-white text-blue-600 border border-blue-200 ring-2 ring-blue-100"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Customer list */}
      <div className="space-y-4">
        {sortedCustomers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            expandedCustomer={expandedCustomer}
            setExpandedCustomer={setExpandedCustomer}
            savingCustomer={savingCustomer}
            newInteraction={newInteraction}
            setNewInteraction={setNewInteraction}
            showReminderForm={showReminderForm}
            setShowReminderForm={setShowReminderForm}
            reminderForm={reminderForm}
            setReminderForm={setReminderForm}
            sendingQuestionnaire={sendingQuestionnaire}
            today={today}
            getCustomerReminders={getCustomerReminders}
            getCustomerInteractions={getCustomerInteractions}
            getNextReminder={getNextReminder}
            hasOverdueReminder={hasOverdueReminder}
            hasTodayReminder={hasTodayReminder}
            hasQuestionnaire={hasQuestionnaire}
            handleUpdateCustomer={handleUpdateCustomer}
            handleUpdateCustomerBoolean={handleUpdateCustomerBoolean}
            markCustomerAsRead={markCustomerAsRead}
            handleAddInteraction={handleAddInteraction}
            handleAddReminder={handleAddReminder}
            handleCompleteReminder={handleCompleteReminder}
            handleSendQuestionnaire={handleSendQuestionnaire}
            handleViewResponses={handleViewResponses}
            formatDate={formatDate}
            formatDateTime={formatDateTime}
          />
        ))}
      </div>

      {sortedCustomers.length === 0 && (
        <div className="p-12 bg-white border border-gray-200 rounded-2xl text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Inga kunder hittades</h3>
          <p className="text-gray-500 mt-1">Det finns inga kunder som matchar ditt filter.</p>
        </div>
      )}

      {/* Reminder Popup Modal */}
      {showReminderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                Ny påminnelse
              </h2>
              <button
                onClick={() => {
                  setShowReminderForm(null);
                  setReminderForm({ title: "", date: "", time: "", type: "follow_up" });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titel *</label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  placeholder="T.ex. Ring kunden"
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Datum *</label>
                  <input
                    type="date"
                    value={reminderForm.date}
                    onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tid</label>
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
                      className="w-12 px-2 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-400 font-medium">:</span>
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
                      className="w-12 px-2 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Typ</label>
                <select
                  value={reminderForm.type}
                  onChange={(e) => setReminderForm({ ...reminderForm, type: e.target.value as ReminderType })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(reminderTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowReminderForm(null);
                  setReminderForm({ title: "", date: "", time: "", type: "follow_up" });
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg transition-colors font-medium shadow-sm"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  handleAddReminder(showReminderForm);
                }}
                disabled={!reminderForm.title || !reminderForm.date}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                Spara påminnelse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setShowSuccessPopup({ show: false })}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Formuläret har skickats!</h3>
            {showSuccessPopup.email && (
              <p className="text-gray-500 mb-6">
                Skickat till <span className="font-medium text-gray-700">{showSuccessPopup.email}</span>
              </p>
            )}
            <button
              onClick={() => setShowSuccessPopup({ show: false })}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              Okej
            </button>
          </div>
        </div>
      )}

      {/* Questionnaire Responses Popup */}
      {showResponsesPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setShowResponsesPopup(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                Formulärsvar
              </h2>
              <button
                onClick={() => setShowResponsesPopup(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingResponses ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : !questionnaireResponses ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Inga svar ännu</h3>
                  <p className="text-gray-500 mt-1">Kunden har inte svarat på formuläret.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status */}
                  {(() => {
                    const status = questionnaireResponses.questionnaire_status as string;
                    const sentAt = questionnaireResponses.sent_at as string | null;
                    const completedAt = questionnaireResponses.completed_at as string | null;
                    return (
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          status === "completed"
                            ? "bg-green-100 text-green-700"
                            : status === "opened"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {status === "completed" ? "Besvarad" : status === "opened" ? "Öppnad" : "Skickad"}
                        </div>
                        {sentAt && (
                          <span className="text-sm text-gray-500">
                            Skickad: {new Date(sentAt).toLocaleDateString("sv-SE")}
                          </span>
                        )}
                        {completedAt && (
                          <span className="text-sm text-gray-500">
                            Besvarad: {new Date(completedAt).toLocaleDateString("sv-SE")}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Response Details */}
                  <div className="grid gap-4">
                    {typeof questionnaireResponses.industry === "string" && questionnaireResponses.industry && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bransch</span>
                        <p className="text-gray-900 font-medium mt-1">{questionnaireResponses.industry}</p>
                      </div>
                    )}

                    {(questionnaireResponses.has_domain !== null || questionnaireResponses.domain_name || questionnaireResponses.wants_domain_help !== null) && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Domän</span>
                        <p className="text-gray-900 font-medium mt-1">
                          {questionnaireResponses.has_domain === true
                            ? `Ja: ${questionnaireResponses.domain_name || "Har domän"}`
                            : questionnaireResponses.has_domain === false
                            ? questionnaireResponses.wants_domain_help
                              ? "Nej, behöver hjälp att skaffa"
                              : "Nej, fixar själv"
                            : "Ej besvarat"}
                        </p>
                        {typeof questionnaireResponses.domain_suggestions === "string" && questionnaireResponses.domain_suggestions && (
                          <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                            <span className="font-medium">Förslag:</span> {questionnaireResponses.domain_suggestions}
                          </p>
                        )}
                      </div>
                    )}

                    {questionnaireResponses.wants_maintenance !== null && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Underhåll</span>
                        <p className="text-gray-900 font-medium mt-1">
                          {questionnaireResponses.wants_maintenance === true ? "Ja, vill ha underhåll" : "Nej, sköter själv"}
                        </p>
                      </div>
                    )}

                    {typeof questionnaireResponses.page_count === "string" && questionnaireResponses.page_count && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Antal sidor</span>
                        <p className="text-gray-900 font-medium mt-1">
                          {(() => {
                            const pageLabels: Record<string, string> = {
                              "1-3": "1-3 sidor (Enkel)",
                              "4-7": "4-7 sidor (Standard)",
                              "8-15": "8-15 sidor (Större)",
                              "15+": "Fler än 15 sidor",
                            };
                            return pageLabels[questionnaireResponses.page_count as string] || questionnaireResponses.page_count;
                          })()}
                        </p>
                      </div>
                    )}

                    {(questionnaireResponses.has_content !== null || typeof questionnaireResponses.content_help_needed === "string") && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Innehåll</span>
                        <p className="text-gray-900 font-medium mt-1">
                          {questionnaireResponses.has_content === true
                            ? "Ja, har bilder & texter klara"
                            : questionnaireResponses.has_content === false
                            ? questionnaireResponses.content_help_needed === "all"
                              ? "Nej, behöver hjälp med allt"
                              : "Delvis, behöver lite hjälp"
                            : "Ej besvarat"}
                        </p>
                      </div>
                    )}

                    {Array.isArray(questionnaireResponses.features) && questionnaireResponses.features.length > 0 && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Funktioner</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(questionnaireResponses.features as string[]).map((feature) => {
                            const featureLabels: Record<string, string> = {
                              contact_form: "Kontaktformulär",
                              booking: "Bokningssystem",
                              webshop: "Webshop / E-handel",
                              blog: "Blogg / Nyheter",
                              gallery: "Bildgalleri / Portfolio",
                              social_feed: "Sociala medier-flöde",
                              newsletter: "Nyhetsbrev-registrering",
                              chat: "Chatt / Support",
                              map: "Karta / Hitta hit",
                              video: "Videor",
                              testimonials: "Kundrecensioner",
                              faq: "Vanliga frågor (FAQ)",
                            };
                            return (
                              <span key={feature} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-lg">
                                {featureLabels[feature] || feature}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {typeof questionnaireResponses.other_features === "string" && questionnaireResponses.other_features && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Övriga funktioner</span>
                        <p className="text-gray-900 mt-1">{questionnaireResponses.other_features}</p>
                      </div>
                    )}

                    {typeof questionnaireResponses.design_preferences === "string" && questionnaireResponses.design_preferences && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Designönskemål</span>
                        <p className="text-gray-900 mt-1">{questionnaireResponses.design_preferences}</p>
                      </div>
                    )}

                    {typeof questionnaireResponses.reference_sites === "string" && questionnaireResponses.reference_sites && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Referenssidor</span>
                        <p className="text-gray-900 mt-1">{questionnaireResponses.reference_sites}</p>
                      </div>
                    )}

                    {typeof questionnaireResponses.timeline === "string" && questionnaireResponses.timeline && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tidslinje</span>
                        <p className="text-gray-900 font-medium mt-1">
                          {(() => {
                            const timelineLabels: Record<string, string> = {
                              asap: "Så snart som möjligt",
                              "1-2weeks": "1-2 veckor",
                              "1month": "Inom 1 månad",
                              "2-3months": "2-3 månader",
                              flexible: "Flexibel / Inget bråttom",
                            };
                            return timelineLabels[questionnaireResponses.timeline as string] || questionnaireResponses.timeline;
                          })()}
                        </p>
                      </div>
                    )}

                    {typeof questionnaireResponses.additional_info === "string" && questionnaireResponses.additional_info && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Övrigt</span>
                        <p className="text-gray-900 mt-1">{questionnaireResponses.additional_info}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowResponsesPopup(null)}
                className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Reminders Popup */}
      {showAllRemindersPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setShowAllRemindersPopup(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Alla påminnelser
              </h2>
              <button
                onClick={() => setShowAllRemindersPopup(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-0 overflow-y-auto flex-1">
              {reminders.filter((r) => !r.is_completed).length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Inga påminnelser</h3>
                  <p className="text-gray-500 mt-1">Du har inga aktiva påminnelser.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reminders
                    .filter((r) => !r.is_completed)
                    .sort((a, b) => a.reminder_date.localeCompare(b.reminder_date))
                    .map((reminder) => {
                      const customer = customers.find((c) => c.id === reminder.customer_id);
                      const isOverdue = reminder.reminder_date < today;
                      const isToday = reminder.reminder_date === today;
                      
                      return (
                        <div
                          key={reminder.id}
                          className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                            isOverdue ? "bg-red-50/30" : isToday ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColors[reminder.type]}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {reminder.title}
                                </p>
                                {isOverdue && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded uppercase tracking-wide">
                                    Försenad
                                  </span>
                                )}
                              </div>
                              {customer && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {customer.first_name} {customer.last_name} • {customer.company_name || "Privatperson"}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className={`text-sm font-medium text-right ${
                              isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-gray-500"
                            }`}>
                              {isToday ? "Idag" : formatDate(reminder.reminder_date)}
                              {reminder.reminder_time && <span className="text-gray-400 font-normal ml-1 block text-xs">kl {reminder.reminder_time}</span>}
                            </div>
                            <button
                              onClick={() => handleCompleteReminder(reminder.id)}
                              className="p-1.5 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                              title="Markera som klar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowAllRemindersPopup(false)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulärfrågor Helper Modal */}
      {showQuestionsHelper && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-500 to-purple-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Formulärfrågor</h2>
                    <p className="text-white/80 text-sm">Använd som stöd vid kundsamtal</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuestionsHelper(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Steg 1 */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center font-bold">1</span>
                  Om verksamheten
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Företagsnamn</strong> - Vad heter företaget?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Org.nummer</strong> - Vilket organisationsnummer har ni?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Kontaktperson</strong> - Vem är kontaktperson?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Befattning</strong> - Vilken roll har kontaktpersonen?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Adress</strong> - Gatuadress, postnummer och ort</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Bransch</strong> - Vilken bransch är ni verksamma inom?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Domän</strong> - Har ni en domän (webbadress)?</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>→ Om ja: Vilken domän?</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>→ Om nej: Vill ni att vi hjälper er skaffa domän? (5 förslag)</span>
                  </li>
                </ul>
              </div>

              {/* Steg 2 */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center font-bold">2</span>
                  Underhåll & Omfattning
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Underhåll</strong> - Vill ni att vi sköter underhåll av webbplatsen? (uppdateringar, säkerhet, support)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Antal sidor</strong> - Hur många sidor behöver webbplatsen?</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• 1-3 sidor (Enkel)</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• 4-7 sidor (Standard)</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• 8-15 sidor (Större)</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• Fler än 15 sidor</span>
                  </li>
                </ul>
              </div>

              {/* Steg 3 */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center font-bold">3</span>
                  Innehåll
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Bilder & texter</strong> - Har ni bilder och texter klara?</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• Ja, allt är klart</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• Delvis (behöver lite hjälp)</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• Nej (behöver hjälp med allt)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Designönskemål</strong> - Färger, stil, känsla? (Modern, minimalistisk, varm, inbjudande?)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Referenssidor</strong> - Finns det webbplatser ni gillar stilen på?</span>
                  </li>
                </ul>
              </div>

              {/* Steg 4 */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center font-bold">4</span>
                  Funktioner
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Vilka funktioner behövs?</strong> (Välj alla som passar)</span>
                  </li>
                </ul>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 pl-4">
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Kontaktformulär</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Bokningssystem</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Webshop / E-handel</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Blogg / Nyheter</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Bildgalleri / Portfolio</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Sociala medier-flöde</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Nyhetsbrev</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Chatt / Support</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Karta / Hitta hit</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Videor</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">Kundrecensioner</span>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">FAQ</span>
                </div>
                <ul className="space-y-2 text-gray-700 mt-3">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Andra funktioner?</strong> - Beskriv andra funktioner ni behöver</span>
                  </li>
                </ul>
              </div>

              {/* Steg 5 */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center font-bold">5</span>
                  Tidslinje
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>När vill ni ha webbplatsen klar?</strong></span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• Så snart som möjligt</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• 1-2 veckor</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• Inom 1 månad</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• 2-3 månader</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500 text-sm pl-4">
                    <span>• Flexibel / Inget bråttom</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span><strong>Övrigt</strong> - Något mer vi bör veta?</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowQuestionsHelper(false)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all font-medium"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
