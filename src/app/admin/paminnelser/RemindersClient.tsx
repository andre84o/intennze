"use client";

import { useState } from "react";
import { Reminder, ReminderType, reminderTypeLabels, Customer } from "@/types/database";
import ReminderModal from "./ReminderModal";
import { createClient } from "@/utils/supabase/client";

interface Props {
  initialReminders: Reminder[];
  customers: Pick<Customer, "id" | "first_name" | "last_name" | "company_name">[];
  error?: string;
}

const typeColors: Record<ReminderType, string> = {
  general: "bg-slate-500",
  follow_up: "bg-blue-500",
  service_update: "bg-purple-500",
  renewal: "bg-amber-500",
  upsell: "bg-green-500",
};

export default function RemindersClient({ initialReminders, customers, error }: Props) {
  const [reminders, setReminders] = useState(initialReminders);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const filteredReminders = reminders.filter((reminder) => {
    if (filter === "pending") return !reminder.is_completed;
    if (filter === "completed") return reminder.is_completed;
    return true;
  });

  const overdueReminders = filteredReminders.filter(
    (r) => !r.is_completed && r.reminder_date < today
  );
  const todayReminders = filteredReminders.filter(
    (r) => !r.is_completed && r.reminder_date === today
  );
  const upcomingReminders = filteredReminders.filter(
    (r) => !r.is_completed && r.reminder_date > today
  );
  const completedReminders = filteredReminders.filter((r) => r.is_completed);

  const handleSave = async (savedReminder: Reminder) => {
    if (editingReminder) {
      setReminders((prev) =>
        prev.map((r) => (r.id === savedReminder.id ? savedReminder : r))
      );
    } else {
      setReminders((prev) => [savedReminder, ...prev]);
    }
    setShowModal(false);
    setEditingReminder(null);
  };

  const handleComplete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("reminders")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, is_completed: true, completed_at: new Date().toISOString() } : r
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna påminnelse?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("reminders").delete().eq("id", id);

    if (!error) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const ReminderCard = ({ reminder }: { reminder: Reminder }) => {
    const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
    const isToday = reminder.reminder_date === today;

    return (
      <div
        className={`p-4 bg-slate-900/50 backdrop-blur-xl border rounded-xl transition-all ${
          isOverdue
            ? "border-red-500/50 bg-red-500/5"
            : isToday
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-slate-800 hover:border-slate-700"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[reminder.type]} bg-opacity-20`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${typeColors[reminder.type]}`} />
                {reminderTypeLabels[reminder.type]}
              </span>
              {isOverdue && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                  Försenad
                </span>
              )}
              {isToday && !reminder.is_completed && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                  Idag
                </span>
              )}
            </div>
            <h3 className="font-medium text-white">{reminder.title}</h3>
            {reminder.description && (
              <p className="text-sm text-slate-400 mt-1">{reminder.description}</p>
            )}
            {reminder.customer && (
              <p className="text-sm text-cyan-400 mt-2">
                {reminder.customer.first_name} {reminder.customer.last_name}
                {reminder.customer.company_name && ` - ${reminder.customer.company_name}`}
              </p>
            )}
            <p className="text-sm text-slate-500 mt-2">
              {reminder.reminder_date}
              {reminder.reminder_time && ` kl ${reminder.reminder_time}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!reminder.is_completed && (
              <button
                onClick={() => handleComplete(reminder.id)}
                className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
                title="Markera som klar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
            <button
              onClick={() => {
                setEditingReminder(reminder);
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
              onClick={() => handleDelete(reminder.id)}
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

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
            Påminnelser
          </h1>
          <p className="text-slate-400 mt-1">Håll koll på uppföljningar och förnyelser</p>
        </div>
        <button
          onClick={() => {
            setEditingReminder(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all duration-300"
        >
          + Ny påminnelse
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "pending", label: "Aktiva", count: reminders.filter((r) => !r.is_completed).length },
          { key: "completed", label: "Klara", count: reminders.filter((r) => r.is_completed).length },
          { key: "all", label: "Alla", count: reminders.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Reminders list */}
      {filter !== "completed" && (
        <>
          {/* Overdue */}
          {overdueReminders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Försenade ({overdueReminders.length})
              </h2>
              <div className="space-y-3">
                {overdueReminders.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          {todayReminders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Idag ({todayReminders.length})
              </h2>
              <div className="space-y-3">
                {todayReminders.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingReminders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-300 mb-4">
                Kommande ({upcomingReminders.length})
              </h2>
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Completed */}
      {(filter === "completed" || filter === "all") && completedReminders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Klara ({completedReminders.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {completedReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </div>
      )}

      {filteredReminders.length === 0 && (
        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-xl text-center text-slate-400">
          Inga påminnelser att visa.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ReminderModal
          reminder={editingReminder}
          customers={customers}
          onClose={() => {
            setShowModal(false);
            setEditingReminder(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
