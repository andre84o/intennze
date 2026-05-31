"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Customer, CustomerStatus, customerStatusLabels, InteractionType, Reminder } from "@/types/database";
import { DesignProps, statusColors, statusDot, interactionIcons } from "./types";

export default function Design5Activity(p: DesignProps) {
  const agendaRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");

  // Today agenda pills animate in
  useEffect(() => {
    if (!agendaRef.current) return;
    const pills = agendaRef.current.querySelectorAll("[data-pill]");
    gsap.from(pills, { x: 30, opacity: 0, stagger: 0.08, duration: 0.4, ease: "power3.out", clearProps: "all" });
  }, []);

  // Activity feed items stagger in
  useEffect(() => {
    if (!feedRef.current) return;
    const items = feedRef.current.querySelectorAll("[data-feed-item]");
    gsap.from(items, { x: -20, opacity: 0, stagger: 0.05, duration: 0.35, ease: "power2.out", delay: 0.2, clearProps: "all" });
  }, []);

  const todayReminders = p.reminders.filter(r => !r.is_completed && r.reminder_date === p.today);
  const overdueReminders = p.reminders.filter(r => !r.is_completed && r.reminder_date < p.today);

  // Build unified feed: reminders + interactions, newest first
  type FeedItem = { date: string; type: "reminder" | "interaction" | "overdue"; reminder?: Reminder; interaction?: { id: string; created_at: string; type: string; description: string; customer_id: string }; customerId: string };

  const feedItems: FeedItem[] = [
    ...p.reminders.filter(r => !r.is_completed && r.reminder_date >= p.today).map(r => ({ date: r.reminder_date, type: "reminder" as const, reminder: r, customerId: r.customer_id ?? "" })),
    ...p.reminders.filter(r => !r.is_completed && r.reminder_date < p.today).map(r => ({ date: r.reminder_date, type: "overdue" as const, reminder: r, customerId: r.customer_id ?? "" })),
    ...p.interactions.map(ia => ({ date: ia.created_at.split("T")[0], type: "interaction" as const, interaction: ia, customerId: ia.customer_id ?? "" })),
  ].sort((a, b) => {
    if (a.type === "overdue" && b.type !== "overdue") return -1;
    if (a.type !== "overdue" && b.type === "overdue") return 1;
    return b.date.localeCompare(a.date);
  });

  const filteredFeed = selectedCustomer ? feedItems.filter(f => f.customerId === selectedCustomer) : feedItems;
  const filteredCustomers = p.customers.filter(c => {
    const q = search.toLowerCase();
    return `${c.first_name} ${c.last_name} ${c.company_name || ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">

      {/* Today's agenda – horizontal scroll */}
      {(todayReminders.length > 0 || overdueReminders.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-none">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Dagens agenda
            </h3>
            <span className="text-xs text-slate-400">{todayReminders.length + overdueReminders.length} påminnelser</span>
          </div>
          <div ref={agendaRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {overdueReminders.map(r => {
              const c = p.customers.find(c => c.id === r.customer_id);
              return (
                <div data-pill key={r.id} className="flex-shrink-0 p-3.5 bg-rose-50 border border-rose-200 rounded-xl min-w-[180px]">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-wide">Försenad</span>
                    <button onClick={() => p.onCompleteReminder(r.id)} className="text-rose-300 hover:text-green-600 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                  </div>
                  <p className="text-sm font-semibold text-rose-800 leading-tight">{r.title}</p>
                  {c && <p className="text-xs text-rose-500 mt-1 truncate">{c.first_name} {c.last_name}</p>}
                  <p className="text-xs text-rose-400 mt-1">{p.formatDate(r.reminder_date)}</p>
                </div>
              );
            })}
            {todayReminders.map(r => {
              const c = p.customers.find(c => c.id === r.customer_id);
              return (
                <div data-pill key={r.id} className="flex-shrink-0 p-3.5 bg-amber-50 border border-amber-200 rounded-xl min-w-[180px]">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">Idag</span>
                    <button onClick={() => p.onCompleteReminder(r.id)} className="text-amber-300 hover:text-green-600 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                  </div>
                  <p className="text-sm font-semibold text-amber-800 leading-tight">{r.title}</p>
                  {c && <p className="text-xs text-amber-500 mt-1 truncate">{c.first_name} {c.last_name}</p>}
                  {r.reminder_time && <p className="text-xs text-amber-400 mt-1">kl {r.reminder_time}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main: feed + sidebar */}
      <div className="flex gap-4 min-h-[500px]">

        {/* Customer index sidebar */}
        <div className="w-64 flex-shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-none flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök…" className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              <button onClick={() => setSelectedCustomer(null)} className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${!selectedCustomer ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}>
                Alla aktiviteter
              </button>
              <Separator className="my-1" />
              {filteredCustomers.map(c => {
                const overdue = p.hasOverdueReminder(c.id);
                const today = p.hasTodayReminder(c.id);
                const isSelected = selectedCustomer === c.id;
                return (
                  <button key={c.id} onClick={() => setSelectedCustomer(isSelected ? null : c.id)} className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-2.5 ${isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"}`}>
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600 font-bold">{c.first_name?.[0]}{c.last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate leading-tight">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.company_name || customerStatusLabels[c.status]}</p>
                    </div>
                    {(overdue || today) && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? "bg-rose-500" : "bg-amber-400"}`} />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Activity feed */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-none flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              {selectedCustomer ? `${p.customers.find(c => c.id === selectedCustomer)?.first_name} ${p.customers.find(c => c.id === selectedCustomer)?.last_name}` : "Aktivitetsflöde"}
            </h3>
            {selectedCustomer && (
              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newNote.trim() && selectedCustomer) { p.onAddInteraction(selectedCustomer, "note" as InteractionType, newNote); setNewNote(""); } }} placeholder="Logga notering och tryck Enter…" className="w-56 px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <button onClick={() => p.onOpenReminderForm(selectedCustomer)} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors flex-shrink-0">+ Påminnelse</button>
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div ref={feedRef} className="p-5 space-y-3">
              {filteredFeed.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-sm">Ingen aktivitet att visa</div>
              )}
              {filteredFeed.map((item, i) => {
                const customer = p.customers.find(c => c.id === item.customerId);
                if (!customer) return null;

                if (item.type === "overdue" && item.reminder) {
                  return (
                    <div data-feed-item key={`ov-${item.reminder.id}`} className="flex gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-rose-600 uppercase tracking-wide">Försenad påminnelse</span>
                          <span className="text-xs text-rose-400">{p.formatDate(item.reminder.reminder_date)}</span>
                        </div>
                        <p className="text-sm font-semibold text-rose-800">{item.reminder.title}</p>
                        <p className="text-xs text-rose-500 mt-0.5">{customer.first_name} {customer.last_name}{customer.company_name && ` · ${customer.company_name}`}</p>
                      </div>
                      <button onClick={() => p.onCompleteReminder(item.reminder!.id)} className="text-rose-300 hover:text-green-600 transition-colors p-1 flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                    </div>
                  );
                }

                if (item.type === "reminder" && item.reminder) {
                  const isToday = item.reminder.reminder_date === p.today;
                  return (
                    <div data-feed-item key={`r-${item.reminder.id}`} className={`flex gap-3 p-4 rounded-xl border ${isToday ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isToday ? "bg-amber-100" : "bg-blue-100"}`}>
                        <svg className={`w-4 h-4 ${isToday ? "text-amber-600" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-amber-600" : "text-blue-600"}`}>{isToday ? "Idag" : p.formatDate(item.reminder.reminder_date)}</span>
                          {item.reminder.reminder_time && <span className={`text-xs ${isToday ? "text-amber-400" : "text-blue-400"}`}>kl {item.reminder.reminder_time}</span>}
                        </div>
                        <p className={`text-sm font-semibold ${isToday ? "text-amber-800" : "text-blue-800"}`}>{item.reminder.title}</p>
                        <p className={`text-xs mt-0.5 ${isToday ? "text-amber-500" : "text-blue-500"}`}>{customer.first_name} {customer.last_name}{customer.company_name && ` · ${customer.company_name}`}</p>
                      </div>
                      <button onClick={() => p.onCompleteReminder(item.reminder!.id)} className="text-slate-300 hover:text-green-600 transition-colors p-1 flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                    </div>
                  );
                }

                if (item.type === "interaction" && item.interaction) {
                  return (
                    <div data-feed-item key={`ia-${item.interaction.id}`} className="flex gap-3 p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-slate-100 text-slate-600 font-bold">{customer.first_name?.[0]}{customer.last_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-slate-700">{customer.first_name} {customer.last_name}</p>
                          <Badge variant="outline" className={`${statusColors[customer.status]} text-[10px] py-0`}>{customerStatusLabels[customer.status]}</Badge>
                          <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{p.formatDateTime(item.interaction.created_at)}</span>
                        </div>
                        {customer.company_name && <p className="text-xs text-slate-400 mb-1">{customer.company_name}</p>}
                        <p className="text-sm text-slate-600">{item.interaction.description}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
