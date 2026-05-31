"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
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

const FacebookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface Questionnaire { id: string; customer_id: string; status: string; }
interface Props {
  customers: Customer[];
  reminders: Reminder[];
  interactions: CustomerInteraction[];
  questionnaires: Questionnaire[];
  error?: string;
}

// ─── THEMES ──────────────────────────────────────────────────────────────────

type ThemeName = "nordic" | "dark" | "corporate" | "warm" | "glass";

interface T {
  name: string; accent: string;
  page: string;
  card: string; cardOverdue: string; cardToday: string; cardExpired: string; cardRadius: string;
  expanded: string; innerCard: string;
  title: string; subtitle: string; bodyText: string; mutedText: string; smallLabel: string;
  statCard: string; statAlertCard: string; statNumber: string; statLabel: string;
  badge: Record<CustomerStatus, string>;
  dot: Record<CustomerStatus, string>;
  filterActive: string; filterInactive: string;
  aCall: string; aReminder: string; aEmail: string; aLog: string; aForm: string; aResponses: string;
  upcomingPanel: string; upcomingHeader: string; upcomingRow: string; upcomingRowToday: string;
  reminderRow: string; reminderRowOverdue: string; reminderRowToday: string;
  activityItem: string; activityIcon: string;
  tips: string; tipsTitle: string; tipsText: string;
  input: string; select: string; textarea: string;
  primaryBtn: string; secondaryBtn: string;
  unreadDot: string; divider: string;
  switcherWrap: string; switcherActive: string; switcherInactive: string;
}

const THEMES: Record<ThemeName, T> = {
  nordic: {
    name: "Ren", accent: "bg-gray-800",
    page: "bg-[#f4f4f6]",
    card: "bg-white border border-gray-200 shadow-sm hover:shadow",
    cardOverdue: "bg-red-50 border border-red-200",
    cardToday: "bg-amber-50 border border-amber-200",
    cardExpired: "bg-red-50 border border-red-300 ring-1 ring-red-200",
    cardRadius: "rounded-xl",
    expanded: "bg-gray-50 border-t border-gray-100",
    innerCard: "bg-white border border-gray-100 rounded-xl shadow-sm",
    title: "text-gray-900 font-semibold",
    subtitle: "text-gray-400",
    bodyText: "text-gray-800",
    mutedText: "text-gray-400",
    smallLabel: "text-gray-400 text-xs uppercase tracking-wider",
    statCard: "bg-white border border-gray-100 rounded-xl shadow-sm",
    statAlertCard: "bg-red-50 border border-red-100 rounded-xl shadow-sm",
    statNumber: "text-gray-900 font-semibold",
    statLabel: "text-gray-400 text-sm",
    badge: { lead: "bg-gray-50 text-gray-600 border border-gray-200", contacted: "bg-sky-50 text-sky-700 border border-sky-100", customer: "bg-emerald-50 text-emerald-700 border border-emerald-100", churned: "bg-rose-50 text-rose-600 border border-rose-100" },
    dot: { lead: "bg-gray-400", contacted: "bg-sky-500", customer: "bg-emerald-500", churned: "bg-rose-400" },
    filterActive: "bg-gray-900 text-white",
    filterInactive: "bg-white text-gray-500 border border-gray-200 hover:border-gray-300",
    aCall: "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100",
    aReminder: "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100",
    aEmail: "bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100",
    aLog: "bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100",
    aForm: "bg-cyan-50 text-cyan-700 border border-cyan-100 hover:bg-cyan-100",
    aResponses: "bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100",
    upcomingPanel: "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden",
    upcomingHeader: "bg-gray-50 border-b border-gray-100",
    upcomingRow: "hover:bg-gray-50",
    upcomingRowToday: "bg-amber-50/40 hover:bg-amber-50",
    reminderRow: "bg-gray-50 border border-gray-100",
    reminderRowOverdue: "bg-red-50 border border-red-100",
    reminderRowToday: "bg-amber-50 border border-amber-100",
    activityItem: "bg-white border border-gray-100 rounded-xl shadow-sm",
    activityIcon: "bg-gray-100 text-gray-500",
    tips: "bg-blue-50 border border-blue-100 rounded-xl",
    tipsTitle: "text-blue-700 font-semibold",
    tipsText: "text-blue-600",
    input: "bg-white border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 placeholder-gray-300",
    select: "bg-white border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400",
    textarea: "bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 placeholder-gray-300",
    primaryBtn: "bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium",
    secondaryBtn: "bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium",
    unreadDot: "bg-blue-500",
    divider: "border-gray-100",
    switcherWrap: "bg-white border border-gray-200 shadow-sm rounded-xl",
    switcherActive: "bg-gray-900 text-white shadow-sm",
    switcherInactive: "text-gray-500 hover:text-gray-800",
  },

  dark: {
    name: "Mörk", accent: "bg-white",
    page: "bg-[#0c0c0e]",
    card: "bg-[#18181b] border border-white/[0.06] hover:border-white/10",
    cardOverdue: "bg-red-950/40 border border-red-800/40",
    cardToday: "bg-amber-950/40 border border-amber-700/40",
    cardExpired: "bg-red-950/60 border border-red-700/60",
    cardRadius: "rounded-xl",
    expanded: "bg-[#141416] border-t border-white/[0.04]",
    innerCard: "bg-[#1e1e22] border border-white/[0.06] rounded-xl",
    title: "text-white font-semibold",
    subtitle: "text-zinc-500",
    bodyText: "text-zinc-200",
    mutedText: "text-zinc-500",
    smallLabel: "text-zinc-500 text-xs uppercase tracking-wider",
    statCard: "bg-[#18181b] border border-white/[0.06] rounded-xl",
    statAlertCard: "bg-red-950/50 border border-red-800/40 rounded-xl",
    statNumber: "text-white font-semibold",
    statLabel: "text-zinc-500 text-sm",
    badge: { lead: "bg-zinc-800 text-zinc-300 border border-zinc-700", contacted: "bg-sky-900/50 text-sky-300 border border-sky-800/50", customer: "bg-emerald-900/50 text-emerald-300 border border-emerald-800/50", churned: "bg-rose-900/50 text-rose-300 border border-rose-800/50" },
    dot: { lead: "bg-zinc-500", contacted: "bg-sky-400", customer: "bg-emerald-400", churned: "bg-rose-500" },
    filterActive: "bg-white text-gray-900",
    filterInactive: "bg-[#18181b] text-zinc-400 border border-white/[0.06] hover:border-white/10 hover:text-zinc-200",
    aCall: "bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60",
    aReminder: "bg-amber-900/40 text-amber-300 border border-amber-800/40 hover:bg-amber-900/60",
    aEmail: "bg-sky-900/40 text-sky-300 border border-sky-800/40 hover:bg-sky-900/60",
    aLog: "bg-purple-900/40 text-purple-300 border border-purple-800/40 hover:bg-purple-900/60",
    aForm: "bg-cyan-900/40 text-cyan-300 border border-cyan-800/40 hover:bg-cyan-900/60",
    aResponses: "bg-indigo-900/40 text-indigo-300 border border-indigo-800/40 hover:bg-indigo-900/60",
    upcomingPanel: "bg-[#18181b] border border-white/[0.06] rounded-xl overflow-hidden",
    upcomingHeader: "bg-[#141416] border-b border-white/[0.04]",
    upcomingRow: "hover:bg-white/[0.03]",
    upcomingRowToday: "bg-amber-900/20 hover:bg-amber-900/30",
    reminderRow: "bg-[#1e1e22] border border-white/[0.04]",
    reminderRowOverdue: "bg-red-950/40 border border-red-800/30",
    reminderRowToday: "bg-amber-950/40 border border-amber-700/30",
    activityItem: "bg-[#1e1e22] border border-white/[0.04] rounded-xl",
    activityIcon: "bg-zinc-800 text-zinc-400",
    tips: "bg-indigo-900/30 border border-indigo-800/30 rounded-xl",
    tipsTitle: "text-indigo-300 font-semibold",
    tipsText: "text-indigo-300/80",
    input: "bg-[#1e1e22] border border-white/[0.08] text-white rounded-lg focus:ring-2 focus:ring-white/10 focus:border-white/20 placeholder-zinc-600",
    select: "bg-[#1e1e22] border border-white/[0.08] text-white rounded-lg focus:ring-2 focus:ring-white/10 focus:border-white/20",
    textarea: "bg-[#1e1e22] border border-white/[0.08] text-white rounded-xl focus:ring-2 focus:ring-white/10 focus:border-white/20 placeholder-zinc-600",
    primaryBtn: "bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium",
    secondaryBtn: "bg-[#1e1e22] text-zinc-300 border border-white/[0.08] rounded-lg hover:bg-[#26262c] font-medium",
    unreadDot: "bg-sky-400",
    divider: "border-white/[0.04]",
    switcherWrap: "bg-[#18181b] border border-white/[0.06] rounded-xl",
    switcherActive: "bg-white text-gray-900 shadow-sm",
    switcherInactive: "text-zinc-400 hover:text-zinc-200",
  },

  corporate: {
    name: "Klassisk", accent: "bg-blue-600",
    page: "bg-slate-100",
    card: "bg-white border-l-[3px] border-l-blue-600 border border-gray-200 shadow-sm hover:shadow",
    cardOverdue: "bg-red-50 border-l-[3px] border-l-red-600 border border-red-200 shadow-sm",
    cardToday: "bg-amber-50 border-l-[3px] border-l-amber-500 border border-amber-200 shadow-sm",
    cardExpired: "bg-red-50 border-l-[3px] border-l-red-700 border border-red-300 shadow",
    cardRadius: "rounded-lg",
    expanded: "bg-slate-50 border-t border-slate-200",
    innerCard: "bg-white border border-slate-200 rounded-lg shadow-sm",
    title: "text-slate-900 font-bold",
    subtitle: "text-slate-500",
    bodyText: "text-slate-800",
    mutedText: "text-slate-500",
    smallLabel: "text-slate-500 text-xs uppercase tracking-wider",
    statCard: "bg-white border border-slate-200 rounded-lg shadow-sm",
    statAlertCard: "bg-red-50 border border-red-200 rounded-lg shadow-sm",
    statNumber: "text-slate-900 font-bold",
    statLabel: "text-slate-500 text-sm",
    badge: { lead: "bg-slate-100 text-slate-700 border border-slate-300", contacted: "bg-blue-100 text-blue-700 border border-blue-200", customer: "bg-green-100 text-green-700 border border-green-200", churned: "bg-red-100 text-red-700 border border-red-200" },
    dot: { lead: "bg-slate-400", contacted: "bg-blue-500", customer: "bg-green-500", churned: "bg-red-500" },
    filterActive: "bg-blue-600 text-white shadow-sm",
    filterInactive: "bg-white text-slate-600 border border-slate-300 hover:border-blue-400 hover:text-blue-600",
    aCall: "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100",
    aReminder: "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100",
    aEmail: "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100",
    aLog: "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100",
    aForm: "bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100",
    aResponses: "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100",
    upcomingPanel: "bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden",
    upcomingHeader: "bg-slate-50 border-b border-slate-200",
    upcomingRow: "hover:bg-blue-50/40",
    upcomingRowToday: "bg-amber-50/60 hover:bg-amber-50",
    reminderRow: "bg-slate-50 border border-slate-200",
    reminderRowOverdue: "bg-red-50 border border-red-200",
    reminderRowToday: "bg-amber-50 border border-amber-200",
    activityItem: "bg-white border border-slate-200 rounded-lg shadow-sm",
    activityIcon: "bg-blue-50 text-blue-600",
    tips: "bg-blue-50 border border-blue-200 rounded-lg",
    tipsTitle: "text-blue-800 font-semibold",
    tipsText: "text-blue-700",
    input: "bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400",
    select: "bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
    textarea: "bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400",
    primaryBtn: "bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium",
    secondaryBtn: "bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium",
    unreadDot: "bg-blue-600",
    divider: "border-slate-200",
    switcherWrap: "bg-white border border-slate-200 shadow-sm rounded-lg",
    switcherActive: "bg-blue-600 text-white shadow-sm",
    switcherInactive: "text-slate-500 hover:text-blue-600",
  },

  warm: {
    name: "Varm", accent: "bg-amber-500",
    page: "bg-[#faf8f5]",
    card: "bg-white border border-stone-200 shadow-sm hover:shadow",
    cardOverdue: "bg-red-50 border border-red-200",
    cardToday: "bg-amber-50 border border-amber-200",
    cardExpired: "bg-red-50 border border-red-300",
    cardRadius: "rounded-2xl",
    expanded: "bg-stone-50 border-t border-stone-100",
    innerCard: "bg-white border border-stone-100 rounded-2xl shadow-sm",
    title: "text-stone-900 font-bold",
    subtitle: "text-stone-400",
    bodyText: "text-stone-800",
    mutedText: "text-stone-400",
    smallLabel: "text-stone-400 text-xs uppercase tracking-wider",
    statCard: "bg-white border border-stone-200 rounded-2xl shadow-sm",
    statAlertCard: "bg-red-50 border border-red-100 rounded-2xl shadow-sm",
    statNumber: "text-stone-900 font-bold",
    statLabel: "text-stone-400 text-sm",
    badge: { lead: "bg-stone-100 text-stone-600 border border-stone-200", contacted: "bg-blue-50 text-blue-600 border border-blue-100", customer: "bg-green-50 text-green-700 border border-green-100", churned: "bg-rose-50 text-rose-600 border border-rose-100" },
    dot: { lead: "bg-stone-400", contacted: "bg-blue-400", customer: "bg-green-500", churned: "bg-rose-400" },
    filterActive: "bg-amber-500 text-white shadow-sm",
    filterInactive: "bg-white text-stone-500 border border-stone-200 hover:border-amber-300 hover:text-amber-700",
    aCall: "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100",
    aReminder: "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100",
    aEmail: "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100",
    aLog: "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100",
    aForm: "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100",
    aResponses: "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100",
    upcomingPanel: "bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden",
    upcomingHeader: "bg-stone-50 border-b border-stone-100",
    upcomingRow: "hover:bg-stone-50",
    upcomingRowToday: "bg-amber-50/60 hover:bg-amber-50",
    reminderRow: "bg-stone-50 border border-stone-100",
    reminderRowOverdue: "bg-red-50 border border-red-100",
    reminderRowToday: "bg-amber-50 border border-amber-100",
    activityItem: "bg-white border border-stone-100 rounded-2xl shadow-sm",
    activityIcon: "bg-amber-50 text-amber-600",
    tips: "bg-amber-50 border border-amber-100 rounded-2xl",
    tipsTitle: "text-amber-800 font-semibold",
    tipsText: "text-amber-700",
    input: "bg-white border border-stone-200 text-stone-900 rounded-xl focus:ring-2 focus:ring-amber-300 focus:border-amber-400 placeholder-stone-300",
    select: "bg-white border border-stone-200 text-stone-900 rounded-xl focus:ring-2 focus:ring-amber-300 focus:border-amber-400",
    textarea: "bg-white border border-stone-200 text-stone-900 rounded-2xl focus:ring-2 focus:ring-amber-300 focus:border-amber-400 placeholder-stone-300",
    primaryBtn: "bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium",
    secondaryBtn: "bg-white text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-50 font-medium",
    unreadDot: "bg-amber-500",
    divider: "border-stone-100",
    switcherWrap: "bg-white border border-stone-200 shadow-sm rounded-2xl",
    switcherActive: "bg-amber-500 text-white shadow-sm",
    switcherInactive: "text-stone-500 hover:text-amber-600",
  },

  glass: {
    name: "Glas", accent: "bg-violet-500",
    page: "bg-gradient-to-br from-slate-900 via-[#1a0e2e] to-slate-900",
    card: "bg-white/[0.05] backdrop-blur-md border border-white/10 hover:bg-white/[0.08] hover:border-white/15",
    cardOverdue: "bg-red-900/20 backdrop-blur-md border border-red-700/30",
    cardToday: "bg-amber-900/20 backdrop-blur-md border border-amber-600/30",
    cardExpired: "bg-red-900/30 backdrop-blur-md border border-red-600/40",
    cardRadius: "rounded-2xl",
    expanded: "bg-white/[0.03] border-t border-white/[0.06]",
    innerCard: "bg-white/[0.06] border border-white/10 rounded-2xl",
    title: "text-white font-bold",
    subtitle: "text-purple-300/60",
    bodyText: "text-white/90",
    mutedText: "text-white/40",
    smallLabel: "text-purple-300/50 text-xs uppercase tracking-wider",
    statCard: "bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-2xl",
    statAlertCard: "bg-red-900/30 backdrop-blur-md border border-red-700/30 rounded-2xl",
    statNumber: "text-white font-bold",
    statLabel: "text-white/50 text-sm",
    badge: { lead: "bg-white/10 text-white/70 border border-white/10", contacted: "bg-sky-500/20 text-sky-300 border border-sky-500/30", customer: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", churned: "bg-rose-500/20 text-rose-300 border border-rose-500/30" },
    dot: { lead: "bg-white/40", contacted: "bg-sky-400", customer: "bg-emerald-400", churned: "bg-rose-400" },
    filterActive: "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-purple-500/25",
    filterInactive: "bg-white/[0.06] text-white/50 border border-white/[0.08] hover:bg-white/10 hover:text-white/80",
    aCall: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25",
    aReminder: "bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25",
    aEmail: "bg-sky-500/15 text-sky-300 border border-sky-500/25 hover:bg-sky-500/25",
    aLog: "bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25",
    aForm: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/25",
    aResponses: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/25",
    upcomingPanel: "bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden",
    upcomingHeader: "bg-white/[0.03] border-b border-white/[0.06]",
    upcomingRow: "hover:bg-white/[0.04]",
    upcomingRowToday: "bg-amber-500/10 hover:bg-amber-500/15",
    reminderRow: "bg-white/[0.05] border border-white/[0.06]",
    reminderRowOverdue: "bg-red-900/20 border border-red-700/30",
    reminderRowToday: "bg-amber-900/20 border border-amber-600/30",
    activityItem: "bg-white/[0.05] border border-white/[0.06] rounded-2xl",
    activityIcon: "bg-white/10 text-white/60",
    tips: "bg-indigo-500/10 border border-indigo-500/20 rounded-2xl",
    tipsTitle: "text-indigo-300 font-semibold",
    tipsText: "text-indigo-300/80",
    input: "bg-white/[0.06] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/50 placeholder-white/20",
    select: "bg-white/[0.06] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/50",
    textarea: "bg-white/[0.06] border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/50 placeholder-white/20",
    primaryBtn: "bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 font-medium shadow-lg shadow-purple-500/25",
    secondaryBtn: "bg-white/[0.06] text-white/70 border border-white/10 rounded-xl hover:bg-white/10 font-medium",
    unreadDot: "bg-violet-400",
    divider: "border-white/[0.06]",
    switcherWrap: "bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl",
    switcherActive: "bg-white text-gray-900 shadow-sm",
    switcherInactive: "text-white/50 hover:text-white/80",
  },
};

// ─── STATIC MAPS ─────────────────────────────────────────────────────────────

const typeColors: Record<ReminderType, string> = {
  general: "bg-gray-500", follow_up: "bg-blue-500", service_update: "bg-purple-500",
  renewal: "bg-amber-500", upsell: "bg-green-500",
};

const interactionIcons: Record<InteractionType, string> = {
  call: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
  email: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  meeting: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  note: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  sale: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  other: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

const isServiceExpired = (customer: Customer) => {
  if (!customer.has_service_agreement || !customer.service_renewal_date) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(customer.service_renewal_date); d.setHours(0, 0, 0, 0);
  return d < today;
};

// ─── CUSTOMER CARD ────────────────────────────────────────────────────────────

interface CustomerCardProps {
  customer: Customer; theme: T;
  expandedCustomer: string | null; setExpandedCustomer: (id: string | null) => void;
  savingCustomer: string | null;
  newInteraction: { customerId: string; type: InteractionType; description: string } | null;
  setNewInteraction: (v: { customerId: string; type: InteractionType; description: string } | null) => void;
  showReminderForm: string | null; setShowReminderForm: (id: string | null) => void;
  reminderForm: { title: string; date: string; time: string; type: ReminderType };
  setReminderForm: (f: { title: string; date: string; time: string; type: ReminderType }) => void;
  sendingQuestionnaire: string | null; today: string;
  getCustomerReminders: (id: string) => Reminder[];
  getCustomerInteractions: (id: string) => CustomerInteraction[];
  getNextReminder: (id: string) => Reminder | null;
  hasOverdueReminder: (id: string) => boolean;
  hasTodayReminder: (id: string) => boolean;
  hasQuestionnaire: (id: string) => boolean;
  handleUpdateCustomer: (id: string, field: string, value: string) => void;
  handleUpdateCustomerBoolean: (id: string, field: string, value: boolean) => void;
  markCustomerAsRead: (id: string) => void;
  handleAddInteraction: () => void;
  handleAddReminder: (id: string) => void;
  handleCompleteReminder: (id: string) => void;
  handleSendQuestionnaire: (id: string) => void;
  handleViewResponses: (id: string) => void;
  formatDate: (s: string) => string;
  formatDateTime: (s: string) => string;
}

const CustomerCard = ({
  customer, theme: t,
  expandedCustomer, setExpandedCustomer, savingCustomer,
  newInteraction, setNewInteraction,
  showReminderForm, setShowReminderForm, reminderForm, setReminderForm,
  sendingQuestionnaire, today,
  getCustomerReminders, getCustomerInteractions, getNextReminder,
  hasOverdueReminder, hasTodayReminder, hasQuestionnaire,
  handleUpdateCustomer, handleUpdateCustomerBoolean, markCustomerAsRead,
  handleAddInteraction, handleAddReminder, handleCompleteReminder,
  handleSendQuestionnaire, handleViewResponses,
  formatDate, formatDateTime,
}: CustomerCardProps) => {
  const isExpanded = expandedCustomer === customer.id;
  const customerReminders = getCustomerReminders(customer.id);
  const customerInteractions = getCustomerInteractions(customer.id);
  const nextReminder = getNextReminder(customer.id);
  const isOverdue = hasOverdueReminder(customer.id);
  const isToday = hasTodayReminder(customer.id);
  const serviceExpired = isServiceExpired(customer);
  const [localWishes, setLocalWishes] = useState(customer.wishes || "");

  const cardClass = serviceExpired ? t.cardExpired : isOverdue ? t.cardOverdue : isToday ? t.cardToday : t.card;

  return (
    <div className={`${cardClass} ${t.cardRadius} transition-all duration-200 shadow-sm`}>
      {/* Header */}
      <div className="p-4 cursor-pointer" onClick={() => { if (!isExpanded) markCustomerAsRead(customer.id); setExpandedCustomer(isExpanded ? null : customer.id); }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${t.badge[customer.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${t.dot[customer.status]}`} />
                {customerStatusLabels[customer.status]}
              </span>
              {serviceExpired && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Utgånget avtal</span>}
              {isOverdue && !serviceExpired && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">Försenad</span>}
              {isToday && !isOverdue && !serviceExpired && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Idag</span>}
            </div>
            <h3 className={`font-semibold text-lg flex items-center gap-2 ${t.bodyText}`}>
              {customer.first_name} {customer.last_name}
              {!customer.is_read && <span className={`w-2 h-2 rounded-full ${t.unreadDot}`} title="Ny lead" />}
            </h3>
            {customer.company_name && <p className={`text-sm ${t.mutedText}`}>{customer.company_name}</p>}
            {nextReminder && (
              <p className={`text-sm mt-2 flex items-center gap-1.5 font-medium text-blue-500`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {nextReminder.title} – {formatDate(nextReminder.reminder_date)}{nextReminder.reminder_time && ` kl ${nextReminder.reminder_time}`}
              </p>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setExpandedCustomer(isExpanded ? null : customer.id); }} className={`p-2 rounded-lg transition-colors ${isExpanded ? "text-blue-500 bg-blue-500/10" : `${t.mutedText} hover:bg-white/10`}`}>
            <svg className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </button>
        </div>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className={`${t.expanded} p-4 space-y-6 ${t.cardRadius === "rounded-2xl" ? "rounded-b-2xl" : t.cardRadius === "rounded-lg" ? "rounded-b-lg" : "rounded-b-xl"}`}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Contact info */}
            <div className={`flex-1 p-5 ${t.innerCard}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`text-sm font-semibold ${t.bodyText} flex items-center gap-2`}>
                  <svg className={`w-4 h-4 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  Kontaktuppgifter
                </h4>
                <select value={customer.status} onChange={(e) => handleUpdateCustomer(customer.id, "status", e.target.value)} disabled={savingCustomer === customer.id} className={`px-3 py-1.5 text-sm focus:outline-none disabled:opacity-50 ${t.select}`}>
                  {Object.entries(customerStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><span className={t.smallLabel}>Förnamn</span><p className={`font-medium truncate ${t.bodyText}`}>{customer.first_name}</p></div>
                <div><span className={t.smallLabel}>Efternamn</span><p className={`font-medium truncate ${t.bodyText}`}>{customer.last_name}</p></div>
                <div className="min-w-0"><span className={t.smallLabel}>E-post</span>{customer.email ? <a href={`mailto:${customer.email}`} className="block text-sm break-all text-blue-500 hover:underline">{customer.email}</a> : <p className={`text-sm ${t.mutedText}`}>–</p>}</div>
                <div className="min-w-0"><span className={t.smallLabel}>Telefon</span>{customer.phone ? <a href={`tel:${customer.phone}`} className="block text-sm break-all text-blue-500 hover:underline">{customer.phone}</a> : <p className={`text-sm ${t.mutedText}`}>–</p>}</div>
              </div>
              <div className={`mt-4 pt-4 border-t ${t.divider}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={customer.has_service_agreement} onChange={(e) => handleUpdateCustomerBoolean(customer.id, "has_service_agreement", e.target.checked)} disabled={savingCustomer === customer.id} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
                  <span className={`text-sm font-medium ${t.bodyText}`}>Har serviceavtal</span>
                  {customer.has_service_agreement && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Aktiv</span>}
                </label>
              </div>
            </div>

            {/* Quick actions */}
            <div className={`lg:w-52 p-5 ${t.innerCard}`}>
              <h4 className={`text-sm font-semibold mb-4 ${t.bodyText}`}>Snabbåtgärder</h4>
              <div className="space-y-2">
                {customer.phone && <a href={`tel:${customer.phone}`} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${t.aCall}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons.call} /></svg>Ring</a>}
                <button onClick={() => setShowReminderForm(customer.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${t.aReminder}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>Påminnelse</button>
                {customer.email && <a href={`mailto:${customer.email}`} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${t.aEmail}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons.email} /></svg>Maila</a>}
                <button onClick={() => setNewInteraction({ customerId: customer.id, type: "note", description: "" })} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${t.aLog}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Logga aktivitet</button>
                {customer.email && <button onClick={() => handleSendQuestionnaire(customer.id)} disabled={sendingQuestionnaire === customer.id} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${t.aForm}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>{sendingQuestionnaire === customer.id ? "Skickar…" : "Skicka formulär"}</button>}
                {hasQuestionnaire(customer.id) && <button onClick={() => handleViewResponses(customer.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${t.aResponses}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Se formulärsvar</button>}
              </div>
            </div>
          </div>

          {/* Önskemål */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${t.bodyText}`}>Önskemål</label>
            <textarea rows={2} value={localWishes} onChange={(e) => setLocalWishes(e.target.value)} onBlur={(e) => { if (e.target.value !== customer.wishes) handleUpdateCustomer(customer.id, "wishes", e.target.value); }} disabled={savingCustomer === customer.id} placeholder="Vad vill kunden ha?" className={`w-full px-4 py-3 text-sm focus:outline-none disabled:opacity-50 ${t.textarea}`} />
          </div>

          {/* New interaction form */}
          {newInteraction?.customerId === customer.id && (
            <div className={`p-4 ${t.tips} border rounded-xl`}>
              <h4 className={`text-sm font-semibold mb-3 ${t.tipsTitle}`}>Logga ny aktivitet</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <select value={newInteraction.type} onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value as InteractionType })} className={`px-3 py-2 text-sm focus:outline-none ${t.select}`}>
                  {Object.entries(interactionTypeLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input type="text" value={newInteraction.description} onChange={(e) => setNewInteraction({ ...newInteraction, description: e.target.value })} placeholder="Beskriv aktiviteten…" className={`flex-1 px-3 py-2 text-sm focus:outline-none ${t.input}`} />
                <div className="flex gap-2">
                  <button onClick={handleAddInteraction} className={`px-4 py-2 text-sm transition-colors ${t.primaryBtn}`}>Spara</button>
                  <button onClick={() => setNewInteraction(null)} className={`px-4 py-2 text-sm transition-colors ${t.secondaryBtn}`}>Avbryt</button>
                </div>
              </div>
            </div>
          )}

          {/* Reminders */}
          {customerReminders.length > 0 && (
            <div className={`p-5 ${t.innerCard}`}>
              <h4 className={`text-sm font-semibold flex items-center gap-2 mb-4 ${t.bodyText}`}>
                <svg className={`w-4 h-4 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                Påminnelser ({customerReminders.length})
              </h4>
              <div className="space-y-2">
                {customerReminders.map((r) => {
                  const ov = r.reminder_date < today; const td = r.reminder_date === today;
                  return (
                    <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg ${ov ? t.reminderRowOverdue : td ? t.reminderRowToday : t.reminderRow}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${typeColors[r.type]}`} />
                        <span className={`text-sm font-medium ${t.bodyText}`}>{r.title}</span>
                        <span className={`text-xs ${t.mutedText}`}>{formatDate(r.reminder_date)}{r.reminder_time && ` ${r.reminder_time}`}</span>
                      </div>
                      <button onClick={() => handleCompleteReminder(r.id)} className={`p-1.5 rounded-md transition-colors ${t.mutedText} hover:text-green-500 hover:bg-green-500/10`} title="Markera som klar">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity history */}
          <div>
            <h4 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${t.bodyText}`}>
              <svg className={`w-4 h-4 ${t.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Senaste aktiviteter
            </h4>
            {customerInteractions.length > 0 ? (
              <div className="space-y-3">
                {customerInteractions.map((ia) => (
                  <div key={ia.id} className={`flex items-start gap-4 p-4 ${t.activityItem}`}>
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 ${t.activityIcon}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons[ia.type]} /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${t.bodyText}`}>{interactionTypeLabels[ia.type]}</span>
                        <span className={`text-xs ${t.mutedText}`}>{formatDateTime(ia.created_at)}</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${t.mutedText}`}>{ia.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm italic ${t.mutedText}`}>Ingen aktivitetshistorik ännu.</p>
            )}
          </div>

          {/* Tips */}
          <div className={`p-5 ${t.tips}`}>
            <h4 className={`text-sm mb-3 flex items-center gap-2 ${t.tipsTitle}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
              Säljstöd
            </h4>
            <ul className={`text-sm space-y-1.5 list-disc list-inside ${t.tipsText}`}>
              {customer.status === "lead" && <li>Första kontakt – presentera dig och förstå kundens behov</li>}
              {customer.status === "contacted" && <li>Följ upp med mer information eller ett möte</li>}
              {!customer.wishes && <li>Fråga om kundens önskemål och behov</li>}
              {customerInteractions.length === 0 && <li>Logga din första kontakt för att spåra framsteg</li>}
              {customerReminders.length === 0 && <li>Lägg till en påminnelse för uppföljning</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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
  const [activeTheme, setActiveTheme] = useState<ThemeName>("nordic");

  const pageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const t = THEMES[activeTheme];
  const today = new Date().toISOString().split("T")[0];

  // GSAP: stagger cards on mount
  useEffect(() => {
    if (cardsRef.current && cardsRef.current.children.length > 0) {
      gsap.from(cardsRef.current.children, { y: 16, opacity: 0, stagger: 0.04, duration: 0.35, ease: "power2.out", clearProps: "all" });
    }
  }, []);

  // GSAP: fade on theme switch
  const handleThemeChange = (theme: ThemeName) => {
    if (pageRef.current) {
      gsap.to(pageRef.current, { opacity: 0, duration: 0.12, onComplete: () => {
        setActiveTheme(theme);
        gsap.to(pageRef.current, { opacity: 1, duration: 0.18 });
      }});
    } else {
      setActiveTheme(theme);
    }
  };

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleSendQuestionnaire = async (customerId: string) => {
    setSendingQuestionnaire(customerId);
    const customer = customers.find(c => c.id === customerId);
    try {
      const res = await fetch("/api/questionnaire/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId }) });
      const result = await res.json();
      if (res.ok) {
        if (result.questionnaireId) setQuestionnaires(p => [...p, { id: result.questionnaireId, customer_id: customerId, status: "sent" }]);
        setShowSuccessPopup({ show: true, email: customer?.email || undefined });
        setTimeout(() => setShowSuccessPopup({ show: false }), 4000);
      } else alert(`Fel: ${result.error || "Kunde inte skicka formuläret"}`);
    } catch { alert("Ett fel uppstod."); }
    finally { setSendingQuestionnaire(null); }
  };

  const handleViewResponses = async (customerId: string) => {
    setShowResponsesPopup(customerId); setLoadingResponses(true); setQuestionnaireResponses(null);
    const supabase = createClient();
    const { data: q } = await supabase.from("questionnaires").select("id, status, sent_at, completed_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(1).single();
    if (q) {
      const { data: r } = await supabase.from("questionnaire_responses").select("*").eq("questionnaire_id", q.id).single();
      setQuestionnaireResponses({ ...r, questionnaire_status: q.status, sent_at: q.sent_at, completed_at: q.completed_at });
    }
    setLoadingResponses(false);
  };

  const handleUpdateCustomer = async (customerId: string, field: string, value: string) => {
    setSavingCustomer(customerId);
    const supabase = createClient();
    const previousStatus = customers.find(c => c.id === customerId)?.status;
    const { error } = await supabase.from("customers").update({ [field]: value }).eq("id", customerId);
    if (!error) {
      setCustomers(p => p.map(c => c.id === customerId ? { ...c, [field]: value } : c));
      if (field === "status" && previousStatus !== value) {
        try { await fetch("/api/meta/conversion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, previousStatus }) }); } catch {}
      }
    }
    setSavingCustomer(null);
  };

  const handleUpdateCustomerBoolean = async (customerId: string, field: string, value: boolean) => {
    setSavingCustomer(customerId);
    const supabase = createClient();
    const { error } = await supabase.from("customers").update({ [field]: value }).eq("id", customerId);
    if (!error) setCustomers(p => p.map(c => c.id === customerId ? { ...c, [field]: value } : c));
    setSavingCustomer(null);
  };

  const handleAddInteraction = async () => {
    if (!newInteraction || !newInteraction.description.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("customer_interactions").insert({ customer_id: newInteraction.customerId, type: newInteraction.type, description: newInteraction.description }).select().single();
    if (!error && data) { setInteractions(p => [data, ...p]); setNewInteraction(null); }
  };

  const handleAddReminder = async (customerId: string) => {
    if (!reminderForm.title || !reminderForm.date) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("reminders").insert({ customer_id: customerId, title: reminderForm.title, reminder_date: reminderForm.date, reminder_time: reminderForm.time || null, type: reminderForm.type }).select().single();
    if (!error && data) { setReminders(p => [...p, data]); setShowReminderForm(null); setReminderForm({ title: "", date: "", time: "", type: "follow_up" }); }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("reminders").update({ is_completed: true, completed_at: new Date().toISOString() }).eq("id", reminderId);
    if (!error) setReminders(p => p.map(r => r.id === reminderId ? { ...r, is_completed: true } : r));
  };

  const markCustomerAsRead = async (customerId: string) => {
    const c = customers.find(c => c.id === customerId);
    if (c && !c.is_read) {
      const supabase = createClient();
      await supabase.from("customers").update({ is_read: true }).eq("id", customerId);
      setCustomers(p => p.map(c => c.id === customerId ? { ...c, is_read: true } : c));
    }
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  const formatDateTime = (s: string) => new Date(s).toLocaleDateString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const getCustomerReminders = (id: string) => reminders.filter(r => r.customer_id === id && !r.is_completed).sort((a, b) => a.reminder_date.localeCompare(b.reminder_date));
  const getNextReminder = (id: string) => getCustomerReminders(id)[0] || null;
  const getCustomerInteractions = (id: string) => interactions.filter(i => i.customer_id === id).slice(0, 5);
  const hasOverdueReminder = (id: string) => reminders.some(r => r.customer_id === id && !r.is_completed && r.reminder_date < today);
  const hasTodayReminder = (id: string) => reminders.some(r => r.customer_id === id && !r.is_completed && r.reminder_date === today);
  const hasQuestionnaire = (id: string) => questionnaires.some(q => q.customer_id === id);

  const filteredCustomers = filter === "all" ? customers : customers.filter(c => c.status === filter);
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const ae = isServiceExpired(a), be = isServiceExpired(b);
    const ao = hasOverdueReminder(a.id), bo = hasOverdueReminder(b.id);
    const at = hasTodayReminder(a.id), bt = hasTodayReminder(b.id);
    if (ae && !be) return -1; if (!ae && be) return 1;
    if (ao && !bo) return -1; if (!ao && bo) return 1;
    if (at && !bt) return -1; if (!at && bt) return 1;
    return 0;
  });

  const expiredServiceCount = customers.filter(c => isServiceExpired(c)).length;
  const overdueCount = customers.filter(c => hasOverdueReminder(c.id)).length;
  const todayCount = customers.filter(c => hasTodayReminder(c.id) && !hasOverdueReminder(c.id)).length;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={pageRef} className={`${t.page} -m-3 sm:-m-6 p-3 sm:p-6 overflow-x-hidden`}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-3xl tracking-tight ${t.title}`}>CRM</h1>
          <p className={`mt-1 text-base ${t.subtitle}`}>Hantera leads och kunduppföljning</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Theme switcher */}
          <div className={`flex items-center gap-1 p-1 ${t.switcherWrap}`}>
            {(Object.keys(THEMES) as ThemeName[]).map((key) => (
              <button key={key} onClick={() => handleThemeChange(key)} title={THEMES[key].name}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTheme === key ? t.switcherActive : t.switcherInactive}`}>
                <span className={`w-2 h-2 rounded-full ${THEMES[key].accent}`} />
                {THEMES[key].name}
              </button>
            ))}
          </div>

          <button onClick={() => setShowQuestionsHelper(true)} className={`px-3 py-2 font-medium rounded-lg flex items-center gap-2 text-sm transition-colors ${t.aForm}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
            Formulärfrågor
          </button>
          {expiredServiceCount > 0 && <span className="px-3 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-medium flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{expiredServiceCount} utgångna</span>}
          {overdueCount > 0 && <span className="px-3 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-medium">{overdueCount} försenade</span>}
          {todayCount > 0 && <span className="px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">{todayCount} idag</span>}
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3"><svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Totalt", value: customers.length, cls: t.statCard, numCls: t.statNumber },
          { label: "Leads", value: customers.filter(c => c.status === "lead").length, cls: t.statCard, numCls: "text-sky-500 font-semibold" },
          { label: "Kunder", value: customers.filter(c => c.status === "customer").length, cls: t.statCard, numCls: "text-emerald-500 font-semibold" },
          { label: "Serviceavtal", value: customers.filter(c => c.has_service_agreement).length, cls: t.statCard, numCls: "text-purple-500 font-semibold" },
          { label: "Facebook Ads", value: customers.filter(c => c.source === "facebook_ads").length, cls: t.statCard, numCls: "text-blue-500 font-semibold", icon: true },
        ].map((s, i) => (
          <div key={i} className={`p-4 ${s.cls}`}>
            {s.icon ? <div className={`flex items-center gap-2 mb-1 ${t.statLabel}`}><FacebookIcon /><span className="text-sm">Facebook</span></div> : <p className={t.statLabel}>{s.label}</p>}
            <p className={`text-2xl ${s.numCls}`}>{s.value}</p>
          </div>
        ))}
        {expiredServiceCount > 0 && <div className={`p-4 ${t.statAlertCard}`}><p className="text-red-500 text-sm">Utgångna</p><p className="text-2xl font-semibold text-red-500">{expiredServiceCount}</p></div>}
      </div>

      {/* Upcoming reminders */}
      {reminders.filter(r => !r.is_completed && r.reminder_date >= today).length > 0 && (
        <div className={`mb-8 ${t.upcomingPanel}`}>
          <div className={`p-4 flex items-center justify-between ${t.upcomingHeader}`}>
            <h3 className={`font-semibold flex items-center gap-2 ${t.bodyText}`}>
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Kommande påminnelser
            </h3>
            <button onClick={() => setShowAllRemindersPopup(true)} className="text-sm text-blue-500 hover:underline font-medium">Visa alla</button>
          </div>
          <div className={`divide-y ${t.divider}`}>
            {reminders.filter(r => !r.is_completed && r.reminder_date >= today).sort((a, b) => a.reminder_date.localeCompare(b.reminder_date)).slice(0, 5).map(r => {
              const c = customers.find(c => c.id === r.customer_id);
              const isT = r.reminder_date === today;
              return (
                <div key={r.id} className={`p-4 flex items-center justify-between group transition-colors ${isT ? t.upcomingRowToday : t.upcomingRow}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColors[r.type]}`} />
                    <div>
                      <p className={`text-sm font-medium ${t.bodyText}`}>{r.title}</p>
                      {c && <p className={`text-xs mt-0.5 ${t.mutedText}`}>{c.first_name} {c.last_name} • {c.company_name || "Privatperson"}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-medium ${isT ? "text-amber-500" : t.mutedText}`}>{isT ? "Idag" : formatDate(r.reminder_date)}{r.reminder_time && <span className={`font-normal ml-1 ${t.mutedText}`}>kl {r.reminder_time}</span>}</div>
                    <button onClick={() => handleCompleteReminder(r.id)} className={`p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 ${t.mutedText} hover:text-green-500`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === "all" ? t.filterActive : t.filterInactive}`}>Alla ({customers.length})</button>
        {Object.entries(customerStatusLabels).map(([key, label]) => {
          const count = customers.filter(c => c.status === key).length;
          if (count === 0) return null;
          return <button key={key} onClick={() => setFilter(key as CustomerStatus)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === key ? t.filterActive : t.filterInactive}`}>{label} ({count})</button>;
        })}
      </div>

      {/* Cards */}
      <div ref={cardsRef} className="space-y-4">
        {sortedCustomers.map(customer => (
          <CustomerCard key={customer.id} customer={customer} theme={t}
            expandedCustomer={expandedCustomer} setExpandedCustomer={setExpandedCustomer}
            savingCustomer={savingCustomer} newInteraction={newInteraction} setNewInteraction={setNewInteraction}
            showReminderForm={showReminderForm} setShowReminderForm={setShowReminderForm}
            reminderForm={reminderForm} setReminderForm={setReminderForm}
            sendingQuestionnaire={sendingQuestionnaire} today={today}
            getCustomerReminders={getCustomerReminders} getCustomerInteractions={getCustomerInteractions}
            getNextReminder={getNextReminder} hasOverdueReminder={hasOverdueReminder}
            hasTodayReminder={hasTodayReminder} hasQuestionnaire={hasQuestionnaire}
            handleUpdateCustomer={handleUpdateCustomer} handleUpdateCustomerBoolean={handleUpdateCustomerBoolean}
            markCustomerAsRead={markCustomerAsRead} handleAddInteraction={handleAddInteraction}
            handleAddReminder={handleAddReminder} handleCompleteReminder={handleCompleteReminder}
            handleSendQuestionnaire={handleSendQuestionnaire} handleViewResponses={handleViewResponses}
            formatDate={formatDate} formatDateTime={formatDateTime}
          />
        ))}
      </div>

      {sortedCustomers.length === 0 && (
        <div className={`p-12 ${t.innerCard} text-center`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${t.activityIcon}`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
          </div>
          <h3 className={`text-lg font-medium ${t.bodyText}`}>Inga kunder hittades</h3>
          <p className={`mt-1 ${t.mutedText}`}>Det finns inga kunder som matchar ditt filter.</p>
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────────── */}

      {/* Reminder modal */}
      {showReminderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                Ny påminnelse
              </h2>
              <button onClick={() => { setShowReminderForm(null); setReminderForm({ title: "", date: "", time: "", type: "follow_up" }); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titel *</label>
                <input type="text" value={reminderForm.title} onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })} placeholder="T.ex. Ring kunden" className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Datum *</label>
                  <input type="date" value={reminderForm.date} onChange={e => setReminderForm({ ...reminderForm, date: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tid</label>
                  <div className="flex items-center gap-1">
                    <input type="text" placeholder="00" maxLength={2} value={reminderForm.time ? reminderForm.time.split(":")[0] : ""} onChange={e => { const h = e.target.value.replace(/\D/g, ""); const m = reminderForm.time?.split(":")[1] || "00"; setReminderForm({ ...reminderForm, time: h ? `${h}:${m}` : "" }); }} className="w-12 px-2 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-gray-400 font-medium">:</span>
                    <input type="text" placeholder="00" maxLength={2} value={reminderForm.time ? reminderForm.time.split(":")[1] || "" : ""} onChange={e => { const m = e.target.value.replace(/\D/g, ""); const h = reminderForm.time?.split(":")[0] || "00"; setReminderForm({ ...reminderForm, time: m ? `${h}:${m}` : "" }); }} className="w-12 px-2 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Typ</label>
                <select value={reminderForm.type} onChange={e => setReminderForm({ ...reminderForm, type: e.target.value as ReminderType })} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(reminderTypeLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setShowReminderForm(null); setReminderForm({ title: "", date: "", time: "", type: "follow_up" }); }} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Avbryt</button>
              <button onClick={() => handleAddReminder(showReminderForm)} disabled={!reminderForm.title || !reminderForm.date} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">Spara påminnelse</button>
            </div>
          </div>
        </div>
      )}

      {/* Success popup */}
      {showSuccessPopup.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowSuccessPopup({ show: false })} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Formuläret har skickats!</h3>
            {showSuccessPopup.email && <p className="text-gray-500 mb-6">Skickat till <span className="font-medium text-gray-700">{showSuccessPopup.email}</span></p>}
            <button onClick={() => setShowSuccessPopup({ show: false })} className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">Okej</button>
          </div>
        </div>
      )}

      {/* Questionnaire responses */}
      {showResponsesPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowResponsesPopup(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>Formulärsvar</h2>
              <button onClick={() => setShowResponsesPopup(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
              {loadingResponses ? (
                <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
              ) : !questionnaireResponses ? (
                <div className="text-center py-12"><h3 className="text-lg font-medium text-gray-900">Inga svar ännu</h3><p className="text-gray-500 mt-1">Kunden har inte svarat på formuläret.</p></div>
              ) : (
                <div className="space-y-4">
                  {(() => { const s = questionnaireResponses.questionnaire_status as string; const sa = questionnaireResponses.sent_at as string | null; const ca = questionnaireResponses.completed_at as string | null; return (<div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-xl"><div className={`px-3 py-1 rounded-full text-sm font-medium ${s === "completed" ? "bg-green-100 text-green-700" : s === "opened" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{s === "completed" ? "Besvarad" : s === "opened" ? "Öppnad" : "Skickad"}</div>{sa && <span className="text-sm text-gray-500">Skickad: {new Date(sa).toLocaleDateString("sv-SE")}</span>}{ca && <span className="text-sm text-gray-500">Besvarad: {new Date(ca).toLocaleDateString("sv-SE")}</span>}</div>); })()}
                  {typeof questionnaireResponses.industry === "string" && questionnaireResponses.industry && <div className="p-4 bg-white border border-gray-200 rounded-xl"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bransch</span><p className="text-gray-900 font-medium mt-1">{questionnaireResponses.industry}</p></div>}
                  {(questionnaireResponses.has_domain !== null || questionnaireResponses.domain_name || questionnaireResponses.wants_domain_help !== null) && <div className="p-4 bg-white border border-gray-200 rounded-xl"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Domän</span><p className="text-gray-900 font-medium mt-1">{questionnaireResponses.has_domain === true ? `Ja: ${questionnaireResponses.domain_name || "Har domän"}` : questionnaireResponses.has_domain === false ? questionnaireResponses.wants_domain_help ? "Nej, behöver hjälp att skaffa" : "Nej, fixar själv" : "Ej besvarat"}</p>{typeof questionnaireResponses.domain_suggestions === "string" && questionnaireResponses.domain_suggestions && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line"><span className="font-medium">Förslag:</span> {questionnaireResponses.domain_suggestions}</p>}</div>}
                  {questionnaireResponses.wants_maintenance !== null && <div className="p-4 bg-white border border-gray-200 rounded-xl"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Underhåll</span><p className="text-gray-900 font-medium mt-1">{questionnaireResponses.wants_maintenance === true ? "Ja, vill ha underhåll" : "Nej, sköter själv"}</p></div>}
                  {typeof questionnaireResponses.page_count === "string" && questionnaireResponses.page_count && <div className="p-4 bg-white border border-gray-200 rounded-xl"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Antal sidor</span><p className="text-gray-900 font-medium mt-1">{({"1-3":"1-3 sidor (Enkel)","4-7":"4-7 sidor (Standard)","8-15":"8-15 sidor (Större)","15+":"Fler än 15 sidor"} as Record<string,string>)[questionnaireResponses.page_count as string] || questionnaireResponses.page_count}</p></div>}
                  {Array.isArray(questionnaireResponses.features) && questionnaireResponses.features.length > 0 && <div className="p-4 bg-white border border-gray-200 rounded-xl"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Funktioner</span><div className="flex flex-wrap gap-2 mt-2">{(questionnaireResponses.features as string[]).map(f => <span key={f} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-lg">{({"contact_form":"Kontaktformulär","booking":"Bokningssystem","webshop":"Webshop","blog":"Blogg","gallery":"Bildgalleri","social_feed":"Sociala medier","newsletter":"Nyhetsbrev","chat":"Chatt","map":"Karta","video":"Videor","testimonials":"Kundrecensioner","faq":"FAQ"} as Record<string,string>)[f] || f}</span>)}</div></div>}
                  {typeof questionnaireResponses.design_preferences === "string" && questionnaireResponses.design_preferences && <div className="p-4 bg-white border border-gray-200 rounded-xl"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Designönskemål</span><p className="text-gray-900 mt-1">{questionnaireResponses.design_preferences}</p></div>}
                  {typeof questionnaireResponses.timeline === "string" && questionnaireResponses.timeline && <div className="p-4 bg-white border border-gray-200 rounded-xl"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tidslinje</span><p className="text-gray-900 font-medium mt-1">{({"asap":"Så snart som möjligt","1-2weeks":"1-2 veckor","1month":"Inom 1 månad","2-3months":"2-3 månader","flexible":"Flexibel"} as Record<string,string>)[questionnaireResponses.timeline as string] || questionnaireResponses.timeline}</p></div>}
                  {typeof questionnaireResponses.additional_info === "string" && questionnaireResponses.additional_info && <div className="p-4 bg-white border border-gray-200 rounded-xl"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Övrigt</span><p className="text-gray-900 mt-1">{questionnaireResponses.additional_info}</p></div>}
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl"><button onClick={() => setShowResponsesPopup(null)} className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Stäng</button></div>
          </div>
        </div>
      )}

      {/* All reminders popup */}
      {showAllRemindersPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAllRemindersPopup(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Alla påminnelser</h2>
              <button onClick={() => setShowAllRemindersPopup(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {reminders.filter(r => !r.is_completed).length === 0 ? (
                <div className="text-center py-12"><h3 className="text-lg font-medium text-gray-900">Inga påminnelser</h3><p className="text-gray-500 mt-1">Du har inga aktiva påminnelser.</p></div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reminders.filter(r => !r.is_completed).sort((a, b) => a.reminder_date.localeCompare(b.reminder_date)).map(r => {
                    const c = customers.find(c => c.id === r.customer_id);
                    const ov = r.reminder_date < today; const isT = r.reminder_date === today;
                    return (
                      <div key={r.id} className={`p-4 flex items-center justify-between group hover:bg-gray-50 transition-colors ${ov ? "bg-red-50/30" : isT ? "bg-amber-50/30" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColors[r.type]}`} />
                          <div>
                            <div className="flex items-center gap-2"><p className="text-sm font-medium text-gray-900">{r.title}{ov && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded uppercase">Försenad</span>}</p></div>
                            {c && <p className="text-xs text-gray-500 mt-0.5">{c.first_name} {c.last_name} • {c.company_name || "Privatperson"}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-sm font-medium ${ov ? "text-red-600" : isT ? "text-amber-600" : "text-gray-500"}`}>{isT ? "Idag" : formatDate(r.reminder_date)}{r.reminder_time && <span className="text-gray-400 font-normal ml-1 block text-xs">kl {r.reminder_time}</span>}</div>
                          <button onClick={() => handleCompleteReminder(r.id)} className="p-1.5 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-full transition-all opacity-0 group-hover:opacity-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl"><button onClick={() => setShowAllRemindersPopup(false)} className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Stäng</button></div>
          </div>
        </div>
      )}

      {/* Formulärfrågor helper */}
      {showQuestionsHelper && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-500 to-purple-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg></div>
                  <div><h2 className="text-xl font-bold text-white">Formulärfrågor</h2><p className="text-white/80 text-sm">Använd som stöd vid kundsamtal</p></div>
                </div>
                <button onClick={() => setShowQuestionsHelper(false)} className="p-2 hover:bg-white/20 rounded-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {[
                { n: 1, title: "Om verksamheten", items: ["Företagsnamn – Vad heter företaget?", "Org.nummer – Vilket organisationsnummer?", "Kontaktperson – Vem är kontaktperson?", "Bransch – Vilken bransch är ni verksamma inom?", "Domän – Har ni en domän (webbadress)?"] },
                { n: 2, title: "Underhåll & Omfattning", items: ["Underhåll – Vill ni att vi sköter underhåll? (uppdateringar, säkerhet, support)", "Antal sidor – 1-3 (Enkel), 4-7 (Standard), 8-15 (Större), 15+"] },
                { n: 3, title: "Innehåll", items: ["Bilder & texter – Har ni material klart?", "Designönskemål – Färger, stil, känsla?", "Referenssidor – Finns det sidor ni gillar stilen på?"] },
                { n: 4, title: "Funktioner", items: ["Kontaktformulär, Bokningssystem, Webshop, Blogg, Bildgalleri, Sociala medier, Nyhetsbrev, Chatt, Karta, Videor, Kundrecensioner, FAQ"] },
                { n: 5, title: "Tidslinje", items: ["Så snart som möjligt", "1-2 veckor", "Inom 1 månad", "2-3 månader", "Flexibel / Inget bråttom", "Övrigt – Något mer vi bör veta?"] },
              ].map(s => (
                <div key={s.n} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center font-bold">{s.n}</span>{s.title}</h3>
                  <ul className="space-y-2">{s.items.map((item, i) => <li key={i} className="flex items-start gap-2 text-gray-700 text-sm"><span className="text-cyan-500 mt-0.5">•</span>{item}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50"><button onClick={() => setShowQuestionsHelper(false)} className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 font-medium">Stäng</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
