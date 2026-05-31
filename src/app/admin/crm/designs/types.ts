import { Customer, CustomerStatus, Reminder, CustomerInteraction, InteractionType, ReminderType } from "@/types/database";

export interface Questionnaire {
  id: string;
  customer_id: string;
  status: string;
}

export interface ReminderFormData {
  title: string;
  date: string;
  time: string;
  type: ReminderType;
}

export interface DesignProps {
  customers: Customer[];
  reminders: Reminder[];
  interactions: CustomerInteraction[];
  questionnaires: Questionnaire[];
  today: string;
  savingCustomer: string | null;
  sendingQuestionnaire: string | null;
  // helpers
  getCustomerReminders: (id: string) => Reminder[];
  getCustomerInteractions: (id: string) => CustomerInteraction[];
  getNextReminder: (id: string) => Reminder | null;
  hasOverdueReminder: (id: string) => boolean;
  hasTodayReminder: (id: string) => boolean;
  hasQuestionnaire: (id: string) => boolean;
  isServiceExpired: (c: Customer) => boolean;
  formatDate: (s: string) => string;
  formatDateTime: (s: string) => string;
  // handlers
  onUpdateCustomer: (id: string, field: string, value: string) => void;
  onUpdateCustomerBoolean: (id: string, field: string, value: boolean) => void;
  onAddInteraction: (customerId: string, type: InteractionType, description: string) => void;
  onDeleteInteraction: (id: string) => void;
  onAddReminder: (customerId: string, form: ReminderFormData) => void;
  onCompleteReminder: (id: string) => void;
  onSendQuestionnaire: (id: string) => void;
  onViewResponses: (id: string) => void;
  onMarkRead: (id: string) => void;
  onReplaceCustomer: (customer: Customer) => void;
}

export const statusLabels: Record<CustomerStatus, string> = {
  lead: "Lead",
  contacted: "Kontaktat",
  customer: "Kund",
  churned: "Nej",
};

export const statusColors: Record<CustomerStatus, string> = {
  lead: "bg-slate-100 text-slate-700 border-slate-200",
  contacted: "bg-blue-100 text-blue-700 border-blue-200",
  customer: "bg-green-100 text-green-700 border-green-200",
  churned: "bg-rose-100 text-rose-600 border-rose-200",
};

export const statusDot: Record<CustomerStatus, string> = {
  lead: "bg-slate-400",
  contacted: "bg-blue-500",
  customer: "bg-green-500",
  churned: "bg-rose-400",
};

export const statusAccent: Record<CustomerStatus, string> = {
  lead: "border-l-slate-400",
  contacted: "border-l-blue-500",
  customer: "border-l-green-500",
  churned: "border-l-rose-400",
};

export const interactionIcons: Record<string, string> = {
  call: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
  email: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  meeting: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  note: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  sale: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  other: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};
