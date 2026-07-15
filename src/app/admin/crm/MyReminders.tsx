export interface MyReminderRow {
  id: string;
  title: string;
  reminder_date: string;
  reminder_time: string | null;
  type: string | null;
  customerName: string | null;
}

// The logged-in user's own overdue reminders are now surfaced as the
// "Påminnelse" stat card in the CRM pipeline header (see Design1Pipeline /
// SalesClient). This module is kept as the shared row type used by crm/page.tsx.
