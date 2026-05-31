"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Customer, CustomerStatus, customerStatusLabels, InteractionType } from "@/types/database";
import { DesignProps, statusColors, statusDot } from "./types";

export default function Design3Dashboard(p: DesignProps) {
  const statsRef = useRef<HTMLDivElement>(null);
  const urgencyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLTableSectionElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");

  // Count-up animation
  useEffect(() => {
    if (!statsRef.current) return;
    statsRef.current.querySelectorAll("[data-count]").forEach(el => {
      const target = parseInt(el.getAttribute("data-count") || "0");
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target, duration: 1.2, ease: "power3.out",
        onUpdate() { el.textContent = Math.round(obj.val).toString(); },
      });
    });
  }, []);

  // Urgency cards slide up
  useEffect(() => {
    if (!urgencyRef.current) return;
    const cards = urgencyRef.current.querySelectorAll("[data-urgency]");
    gsap.from(cards, { y: 24, opacity: 0, stagger: 0.08, duration: 0.5, ease: "power3.out", delay: 0.4, clearProps: "all" });
  }, []);

  // List rows stagger
  useEffect(() => {
    if (!listRef.current) return;
    gsap.from(listRef.current.querySelectorAll("tr"), { opacity: 0, y: 6, stagger: 0.03, duration: 0.3, ease: "power2.out", delay: 0.6, clearProps: "all" });
  }, []);

  const overdue = p.customers.filter(c => p.hasOverdueReminder(c.id));
  const todayList = p.customers.filter(c => p.hasTodayReminder(c.id) && !p.hasOverdueReminder(c.id));
  const expired = p.customers.filter(c => p.isServiceExpired(c));
  const urgencyItems = [...expired, ...overdue.filter(c => !p.isServiceExpired(c)), ...todayList].slice(0, 6);

  const stats = [
    { label: "Leads", value: p.customers.filter(c => c.status === "lead").length, icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Kunder", value: p.customers.filter(c => c.status === "customer").length, icon: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
    { label: "Försenade", value: overdue.length, icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
    { label: "Idag", value: todayList.length, icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  ];

  return (
    <div className="space-y-6">

      {/* Metric cards */}
      <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className={`border ${s.border} shadow-none`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
                  <p data-count={s.value} className={`text-4xl font-bold ${s.color}`}>0</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <svg className={`w-5 h-5 ${s.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Urgency section */}
      {urgencyItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Kräver uppmärksamhet
          </h3>
          <div ref={urgencyRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgencyItems.map(c => {
              const isExpired = p.isServiceExpired(c);
              const isOverdue = p.hasOverdueReminder(c.id);
              const next = p.getNextReminder(c.id);
              return (
                <div data-urgency key={c.id} className={`p-4 rounded-2xl border flex items-start gap-3 ${isExpired ? "bg-red-50 border-red-200" : isOverdue ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className="bg-white text-slate-600 text-xs font-bold">{c.first_name?.[0]}{c.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                    {c.company_name && <p className="text-xs text-slate-500 truncate">{c.company_name}</p>}
                    {isExpired && <span className="inline-block mt-1 text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">Utgånget avtal</span>}
                    {!isExpired && next && <p className="text-xs text-rose-600 font-medium mt-1">{next.title} · {p.formatDate(next.reminder_date)}</p>}
                  </div>
                  {c.phone && <a href={`tel:${c.phone}`} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-200 transition-colors flex-shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></a>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Full customer list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Alla kunder ({p.customers.length})</h3>
        <Card className="border border-slate-200 shadow-none overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namn</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Företag</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Påminnelse</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody ref={listRef} className="divide-y divide-slate-50">
              {p.customers.map(c => {
                const next = p.getNextReminder(c.id);
                const isExpanded = expandedId === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : c.id)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-slate-100 text-slate-600 font-semibold">{c.first_name?.[0]}{c.last_name?.[0]}</AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 text-sm">{c.first_name} {c.last_name}{!c.is_read && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />}</td>
                      <td className="px-4 py-3 text-slate-500 text-sm hidden md:table-cell">{c.company_name || "–"}</td>
                      <td className="px-4 py-3">
                        <select value={c.status} onClick={e => e.stopPropagation()} onChange={e => p.onUpdateCustomer(c.id, "status", e.target.value)} className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${statusColors[c.status]} bg-transparent`}>
                          {Object.entries(customerStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm hidden lg:table-cell">
                        {next ? <span className={`font-medium ${p.hasOverdueReminder(c.id) ? "text-rose-600" : "text-slate-600"}`}>{next.title} · {p.formatDate(next.reminder_date)}</span> : <span className="text-slate-300">–</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></a>}
                          <button onClick={e => { e.stopPropagation(); p.onOpenReminderForm(c.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg></button>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${c.id}-expanded`} className="bg-slate-50/60">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Logga notering</p>
                              <div className="flex gap-2">
                                <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newNote.trim()) { p.onAddInteraction(c.id, "note" as InteractionType, newNote); setNewNote(""); } }} placeholder="Skriv och tryck Enter…" className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                <button onClick={() => { if (newNote.trim()) { p.onAddInteraction(c.id, "note" as InteractionType, newNote); setNewNote(""); } }} className="px-3 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700">Spara</button>
                              </div>
                            </div>
                            {p.hasQuestionnaire(c.id) && <button onClick={() => p.onViewResponses(c.id)} className="px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-medium hover:bg-indigo-100 self-end">Se formulärsvar</button>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
