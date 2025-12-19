"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Reminder, ReminderType, reminderTypeLabels } from "@/types/database";

interface DueReminder {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  type: ReminderType;
  is_completed: boolean;
  customer?: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function ReminderNotifications() {
  const [reminders, setReminders] = useState<DueReminder[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchDueReminders = async () => {
      const supabase = createClient();
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("reminders")
        .select(`
          *,
          customer:customers(first_name, last_name)
        `)
        .eq("is_completed", false)
        .lte("reminder_date", today)
        .order("reminder_date", { ascending: true })
        .order("reminder_time", { ascending: true });

      if (!error && data) {
        // Filtrera bort dismissed och de som redan har passerat tiden
        const dueReminders = data.filter((reminder) => {
          if (dismissed.has(reminder.id)) return false;
          if (reminder.reminder_date < today) return true;
          if (reminder.reminder_date === today) {
            if (!reminder.reminder_time) return true;
            const currentTime = now.toTimeString().slice(0, 5);
            return reminder.reminder_time <= currentTime;
          }
          return false;
        });
        setReminders(dueReminders);
      }
    };

    fetchDueReminders();

    // Uppdatera var 30:e sekund
    const interval = setInterval(fetchDueReminders, 30000);
    return () => clearInterval(interval);
  }, [dismissed]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const handleMarkComplete = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from("reminders")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  if (reminders.length === 0) return null;

  const typeColors: Record<string, string> = {
    general: "bg-slate-500",
    follow_up: "bg-blue-500",
    service_update: "bg-purple-500",
    renewal: "bg-amber-500",
    upsell: "bg-green-500",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Collapsed view - just the badge */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all animate-pulse hover:animate-none"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="font-semibold">{reminders.length} påminnelse{reminders.length > 1 ? 'r' : ''}</span>
        </button>
      )}

      {/* Expanded view - list of reminders */}
      {isExpanded && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {reminders.length} påminnelse{reminders.length > 1 ? 'r' : ''}
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Reminder list */}
          <div className="max-h-80 overflow-y-auto">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="p-4 border-b border-slate-800 last:border-b-0 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${typeColors[reminder.type] || typeColors.general}`} />
                      <span className="text-xs text-slate-500">
                        {reminderTypeLabels[reminder.type]}
                      </span>
                    </div>
                    <h4 className="text-white font-medium truncate">{reminder.title}</h4>
                    {reminder.customer && (
                      <p className="text-slate-400 text-sm">
                        {reminder.customer.first_name} {reminder.customer.last_name}
                      </p>
                    )}
                    <p className="text-slate-500 text-xs mt-1">
                      {reminder.reminder_date} {reminder.reminder_time || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMarkComplete(reminder.id)}
                      className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                      title="Markera som klar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDismiss(reminder.id)}
                      className="p-1.5 text-slate-400 hover:bg-slate-700 rounded transition-colors"
                      title="Avfärda"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700">
            <Link
              href="/admin/paminnelser"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Visa alla påminnelser →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
