"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Customer, CustomerStatus, customerStatusLabels, InteractionType } from "@/types/database";
import { DesignProps, statusColors, statusDot, interactionIcons } from "./types";

const COLUMNS: { key: CustomerStatus; label: string; color: string; headerBg: string; cardBg: string; border: string }[] = [
  { key: "lead", label: "Lead", color: "text-slate-700", headerBg: "bg-slate-100", cardBg: "bg-white", border: "border-slate-200" },
  { key: "contacted", label: "Kontaktat", color: "text-blue-700", headerBg: "bg-blue-50", cardBg: "bg-white", border: "border-blue-100" },
  { key: "customer", label: "Kund", color: "text-green-700", headerBg: "bg-green-50", cardBg: "bg-white", border: "border-green-100" },
  { key: "churned", label: "Nej", color: "text-rose-600", headerBg: "bg-rose-50", cardBg: "bg-white", border: "border-rose-100" },
];

export default function Design4Kanban(p: DesignProps) {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [newNote, setNewNote] = useState("");
  const columnsRef = useRef<HTMLDivElement>(null);

  // Stagger columns on mount
  useEffect(() => {
    if (!columnsRef.current) return;
    const cols = columnsRef.current.querySelectorAll("[data-col]");
    gsap.from(cols, { x: -30, opacity: 0, stagger: 0.12, duration: 0.45, ease: "power3.out", clearProps: "all" });
  }, []);

  // Stagger cards when column appears
  useEffect(() => {
    if (!columnsRef.current) return;
    const cards = columnsRef.current.querySelectorAll("[data-card]");
    gsap.from(cards, { y: 16, opacity: 0, stagger: 0.04, duration: 0.35, ease: "power2.out", delay: 0.2, clearProps: "all" });
  }, []);

  const interactions = selected ? p.getCustomerInteractions(selected.id) : [];
  const reminders = selected ? p.getCustomerReminders(selected.id) : [];

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm text-slate-500 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-none">
        <span className="font-semibold text-slate-700">Totalt: {p.customers.length}</span>
        <span className="w-px h-4 bg-slate-200" />
        {COLUMNS.map(col => <span key={col.key} className={`font-medium ${col.color}`}>{col.label}: {p.customers.filter(c => c.status === col.key).length}</span>)}
        {p.customers.filter(c => p.hasOverdueReminder(c.id)).length > 0 && <><span className="w-px h-4 bg-slate-200" /><span className="text-rose-600 font-medium flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />{p.customers.filter(c => p.hasOverdueReminder(c.id)).length} försenade</span></>}
      </div>

      {/* Kanban columns */}
      <div ref={columnsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(col => {
          const colCustomers = p.customers.filter(c => c.status === col.key).sort((a, b) => {
            if (p.hasOverdueReminder(a.id) && !p.hasOverdueReminder(b.id)) return -1;
            if (!p.hasOverdueReminder(a.id) && p.hasOverdueReminder(b.id)) return 1;
            return 0;
          });

          return (
            <div key={col.key} data-col className="flex flex-col gap-2">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusDot[col.key]}`} />
                  <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 ${col.color}`}>{colCustomers.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[100px]">
                {colCustomers.map(c => {
                  const overdue = p.hasOverdueReminder(c.id);
                  const today = p.hasTodayReminder(c.id);
                  const expired = p.isServiceExpired(c);
                  const next = p.getNextReminder(c.id);

                  return (
                    <div
                      data-card
                      key={c.id}
                      onClick={() => { setSelected(c); p.onMarkRead(c.id); }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${expired ? "bg-red-50 border-red-200" : overdue ? "bg-rose-50 border-rose-200" : today ? "bg-amber-50 border-amber-100" : `${col.cardBg} ${col.border}`} shadow-sm`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-slate-100 text-slate-600 font-bold">{c.first_name?.[0]}{c.last_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{c.first_name} {c.last_name}</p>
                          {c.company_name && <p className="text-xs text-slate-400 truncate">{c.company_name}</p>}
                        </div>
                        {!c.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                      </div>

                      {next && (
                        <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium rounded-lg px-2 py-1 ${overdue ? "bg-rose-100 text-rose-700" : today ? "bg-amber-100 text-amber-700" : "bg-slate-50 text-slate-500"}`}>
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="truncate">{next.title}</span>
                          <span className="flex-shrink-0 font-normal opacity-70">· {p.formatDate(next.reminder_date)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="text-slate-400 hover:text-green-600 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></a>}
                        {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-slate-400 hover:text-blue-600 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg></a>}
                        <button onClick={e => { e.stopPropagation(); p.onOpenReminderForm(c.id); }} className="text-slate-400 hover:text-amber-600 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg></button>
                        {expired && <span className="ml-auto text-xs font-medium text-red-600 bg-red-100 rounded-full px-2 py-0.5">Utgånget</span>}
                      </div>
                    </div>
                  );
                })}
                {colCustomers.length === 0 && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">Inga</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-white">
          {selected && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-lg">{selected.first_name?.[0]}{selected.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selected.first_name} {selected.last_name}</DialogTitle>
                    {selected.company_name && <p className="text-sm text-slate-500 mt-0.5">{selected.company_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="outline" className={`${statusColors[selected.status]} text-xs`}>{customerStatusLabels[selected.status]}</Badge>
                  <select value={selected.status} onChange={e => { p.onUpdateCustomer(selected.id, "status", e.target.value); setSelected({ ...selected, status: e.target.value as CustomerStatus }); }} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {Object.entries(customerStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-5 py-2">
                  <div className="grid grid-cols-3 gap-2">
                    {selected.phone && <a href={`tel:${selected.phone}`} className="flex flex-col items-center gap-1.5 p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 hover:bg-green-100 transition-colors text-xs font-medium"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>Ring</a>}
                    {selected.email && <a href={`mailto:${selected.email}`} className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors text-xs font-medium"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>Maila</a>}
                    <button onClick={() => { p.onOpenReminderForm(selected.id); setSelected(null); }} className="flex flex-col items-center gap-1.5 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 hover:bg-amber-100 transition-colors text-xs font-medium"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>Påminnelse</button>
                  </div>

                  {reminders.length > 0 && <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Påminnelser</p>
                      {reminders.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <div><p className="text-sm font-medium text-amber-800">{r.title}</p><p className="text-xs text-amber-500">{p.formatDate(r.reminder_date)}</p></div>
                          <button onClick={() => p.onCompleteReminder(r.id)} className="text-amber-300 hover:text-green-600 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                        </div>
                      ))}
                    </div>
                  </>}

                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Logga notering</p>
                    <div className="flex gap-2">
                      <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newNote.trim()) { p.onAddInteraction(selected.id, "note" as InteractionType, newNote); setNewNote(""); } }} placeholder="Skriv och tryck Enter…" className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      <button onClick={() => { if (newNote.trim()) { p.onAddInteraction(selected.id, "note" as InteractionType, newNote); setNewNote(""); } }} className="px-3 py-2 bg-slate-800 text-white text-sm rounded-lg">Spara</button>
                    </div>
                  </div>

                  {interactions.length > 0 && <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktiviteter</p>
                      {interactions.map(ia => (
                        <div key={ia.id} className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons[ia.type] || interactionIcons.other} /></svg></div>
                          <div><p className="text-xs text-slate-400">{p.formatDateTime(ia.created_at)}</p><p className="text-sm text-slate-700">{ia.description}</p></div>
                        </div>
                      ))}
                    </div>
                  </>}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
