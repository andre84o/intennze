"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Customer, CustomerStatus, customerStatusLabels, InteractionType } from "@/types/database";
import { DesignProps, statusColors, statusAccent, statusDot, interactionIcons } from "./types";

export default function Design2Focus(p: DesignProps) {
  const [selected, setSelected] = useState<Customer | null>(p.customers[0] || null);
  const [search, setSearch] = useState("");
  const [newNote, setNewNote] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevId = useRef<string | null>(null);

  // Stagger list items on mount
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-list-item]");
    gsap.from(items, { x: -20, opacity: 0, stagger: 0.04, duration: 0.35, ease: "power2.out", clearProps: "all" });
  }, []);

  // Animate detail panel on customer change
  useEffect(() => {
    if (!detailRef.current || !selected) return;
    if (prevId.current !== selected.id) {
      gsap.fromTo(detailRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.25, ease: "power2.out" });
      prevId.current = selected.id;
    }
  }, [selected]);

  const filtered = p.customers.filter(c => {
    const q = search.toLowerCase();
    return `${c.first_name} ${c.last_name} ${c.company_name || ""}`.toLowerCase().includes(q);
  }).sort((a, b) => {
    if (p.hasOverdueReminder(a.id) && !p.hasOverdueReminder(b.id)) return -1;
    if (!p.hasOverdueReminder(a.id) && p.hasOverdueReminder(b.id)) return 1;
    return 0;
  });

  const interactions = selected ? p.getCustomerInteractions(selected.id) : [];
  const reminders = selected ? p.getCustomerReminders(selected.id) : [];
  const nextReminder = selected ? p.getNextReminder(selected.id) : null;

  return (
    <div className="flex h-[calc(100vh-180px)] gap-0 rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">

      {/* Left – Customer list */}
      <div className="w-80 flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/60">
        {/* Search */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök kund..." className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div ref={listRef} className="py-2">
            {filtered.map(c => {
              const overdue = p.hasOverdueReminder(c.id);
              const today = p.hasTodayReminder(c.id);
              const next = p.getNextReminder(c.id);
              const isSelected = selected?.id === c.id;

              return (
                <button
                  key={c.id}
                  data-list-item
                  onClick={() => { setSelected(c); p.onMarkRead(c.id); }}
                  className={`w-full text-left px-3 py-3 mx-0 border-l-[3px] transition-all ${isSelected ? `bg-white border-l-blue-500 shadow-sm` : `${statusAccent[c.status]} bg-transparent hover:bg-white/70`} ${overdue ? "border-l-rose-500" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className={`text-xs font-bold ${isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                        {!c.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                        {overdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{c.company_name || customerStatusLabels[c.status]}</p>
                      {next && <p className={`text-xs mt-0.5 truncate font-medium ${overdue ? "text-rose-500" : today ? "text-amber-500" : "text-blue-500"}`}>{next.title} · {p.formatDate(next.reminder_date)}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-slate-100 bg-white">
          <p className="text-xs text-slate-400 text-center">{filtered.length} av {p.customers.length} kunder</p>
        </div>
      </div>

      {/* Right – Detail panel */}
      <div ref={detailRef} className="flex-1 overflow-hidden flex flex-col">
        {selected ? (
          <>
            {/* Detail header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-xl">
                    {selected.first_name?.[0]}{selected.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.first_name} {selected.last_name}</h2>
                  {selected.company_name && <p className="text-sm text-slate-500">{selected.company_name}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`${statusColors[selected.status]} text-xs`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusDot[selected.status]}`} />
                      {customerStatusLabels[selected.status]}
                    </Badge>
                    {p.isServiceExpired(selected) && <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">Utgånget avtal</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select value={selected.status} onChange={e => { p.onUpdateCustomer(selected.id, "status", e.target.value); setSelected({ ...selected, status: e.target.value as CustomerStatus }); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(customerStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {selected.phone && <a href={`tel:${selected.phone}`} className="p-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></a>}
                {selected.email && <a href={`mailto:${selected.email}`} className="p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg></a>}
                <button onClick={() => p.onOpenReminderForm(selected.id)} className="p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg></button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-8 py-6 space-y-8">

                {/* Timeline – reminders + activity combined */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Tidslinje</p>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />
                    <div className="space-y-4 pl-10">
                      {/* Upcoming reminders */}
                      {reminders.map(r => (
                        <div key={r.id} className="relative">
                          <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          </div>
                          <div className="flex items-start justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <div>
                              <p className="text-sm font-semibold text-amber-800">{r.title}</p>
                              <p className="text-xs text-amber-600 mt-0.5">{p.formatDate(r.reminder_date)}{r.reminder_time && ` kl ${r.reminder_time}`}</p>
                            </div>
                            <button onClick={() => p.onCompleteReminder(r.id)} className="text-amber-300 hover:text-green-600 transition-colors p-1 flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                          </div>
                        </div>
                      ))}
                      {/* Activity log */}
                      {interactions.map(ia => (
                        <div key={ia.id} className="relative">
                          <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          </div>
                          <p className="text-xs text-slate-400 mb-1">{p.formatDateTime(ia.created_at)}</p>
                          <p className="text-sm text-slate-700 bg-white border border-slate-100 rounded-xl px-4 py-3">{ia.description}</p>
                        </div>
                      ))}
                      {reminders.length === 0 && interactions.length === 0 && (
                        <div className="relative">
                          <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-200" />
                          <p className="text-sm text-slate-400 italic">Ingen aktivitet ännu</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Log new note */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Logga notering</p>
                  <div className="flex gap-2">
                    <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newNote.trim()) { p.onAddInteraction(selected.id, "note" as InteractionType, newNote); setNewNote(""); } }} placeholder="Skriv en notering och tryck Enter…" className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400" />
                    <Button onClick={() => { if (newNote.trim()) { p.onAddInteraction(selected.id, "note" as InteractionType, newNote); setNewNote(""); } }} className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4">Spara</Button>
                  </div>
                </div>

                {/* Wishes */}
                {selected.wishes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Önskemål</p>
                      <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">{selected.wishes}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              </div>
              <p className="text-slate-500">Välj en kund till vänster</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
