"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Customer, CustomerStatus, customerStatusLabels, InteractionType } from "@/types/database";
import { DesignProps, statusColors, statusDot, interactionIcons } from "./types";

export default function Design1Pipeline(p: DesignProps) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [newNote, setNewNote] = useState("");

  // Count-up animation for stats
  useEffect(() => {
    if (!statsRef.current) return;
    const els = statsRef.current.querySelectorAll("[data-count]");
    els.forEach((el) => {
      const target = parseInt(el.getAttribute("data-count") || "0");
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: target, duration: 1, ease: "power2.out", snap: { innerText: 1 },
        onUpdate() { el.textContent = Math.round(parseFloat((el as HTMLElement).innerText)).toString(); },
      });
    });
  }, []);

  // Stagger rows on tab change
  useEffect(() => {
    if (!tableRef.current) return;
    const rows = tableRef.current.querySelectorAll("tr");
    gsap.from(rows, { opacity: 0, y: 8, stagger: 0.04, duration: 0.3, ease: "power2.out", clearProps: "all" });
  }, [activeTab]);

  const tabs = [
    { key: "all", label: "Alla", count: p.customers.length },
    { key: "lead", label: "Lead", count: p.customers.filter(c => c.status === "lead").length },
    { key: "contacted", label: "Kontaktat", count: p.customers.filter(c => c.status === "contacted").length },
    { key: "customer", label: "Kund", count: p.customers.filter(c => c.status === "customer").length },
    { key: "churned", label: "Nej", count: p.customers.filter(c => c.status === "churned").length },
  ];

  const filtered = activeTab === "all" ? p.customers : p.customers.filter(c => c.status === activeTab);
  const sorted = [...filtered].sort((a, b) => {
    if (p.isServiceExpired(a) && !p.isServiceExpired(b)) return -1;
    if (!p.isServiceExpired(a) && p.isServiceExpired(b)) return 1;
    if (p.hasOverdueReminder(a.id) && !p.hasOverdueReminder(b.id)) return -1;
    if (!p.hasOverdueReminder(a.id) && p.hasOverdueReminder(b.id)) return 1;
    return 0;
  });

  const customerInteractions = selected ? p.getCustomerInteractions(selected.id) : [];
  const customerReminders = selected ? p.getCustomerReminders(selected.id) : [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Totalt", count: p.customers.length, color: "text-slate-800" },
          { label: "Leads", count: p.customers.filter(c => c.status === "lead").length, color: "text-blue-600" },
          { label: "Kunder", count: p.customers.filter(c => c.status === "customer").length, color: "text-green-600" },
          { label: "Försenade", count: p.customers.filter(c => p.hasOverdueReminder(c.id)).length, color: "text-rose-600" },
        ].map((s) => (
          <Card key={s.label} className="border border-slate-200 shadow-none">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p data-count={s.count} className={`text-3xl font-bold ${s.color}`}>0</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Table */}
      <Card className="border border-slate-200 shadow-none overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelected(null); }}>
          <div className="border-b border-slate-100 px-4 pt-1">
            <TabsList className="bg-transparent h-auto gap-1 p-0">
              {tabs.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-slate-500">
                  {t.label}
                  {t.count > 0 && <span className="ml-2 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{t.count}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabs.map(t => (
            <TabsContent key={t.key} value={t.key} className="m-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider">Namn</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">Företag</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">Nästa påminnelse</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">Aktivitet</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody ref={tableRef}>
                  {sorted.map((c) => {
                    const next = p.getNextReminder(c.id);
                    const overdue = p.hasOverdueReminder(c.id);
                    const today = p.hasTodayReminder(c.id);
                    const expired = p.isServiceExpired(c);
                    const interactions = p.getCustomerInteractions(c.id);
                    return (
                      <TableRow
                        key={c.id}
                        onClick={() => { setSelected(c); p.onMarkRead(c.id); }}
                        className={`cursor-pointer transition-colors ${selected?.id === c.id ? "bg-blue-50" : "hover:bg-slate-50"} ${expired ? "bg-red-50/40" : overdue ? "bg-rose-50/30" : today ? "bg-amber-50/30" : ""}`}
                      >
                        <TableCell className="py-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                              {c.first_name?.[0]}{c.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            {c.first_name} {c.last_name}
                            {!c.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-slate-500 text-sm hidden md:table-cell">{c.company_name || "–"}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-xs font-medium ${statusColors[c.status]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusDot[c.status]}`} />
                            {customerStatusLabels[c.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-sm hidden lg:table-cell">
                          {next ? (
                            <span className={`font-medium ${overdue ? "text-rose-600" : today ? "text-amber-600" : "text-slate-600"}`}>
                              {next.title} · {p.formatDate(next.reminder_date)}
                            </span>
                          ) : <span className="text-slate-300">–</span>}
                        </TableCell>
                        <TableCell className="py-3 hidden lg:table-cell">
                          {interactions.length > 0 ? (
                            <span className="text-xs text-slate-500">{interactions.length} aktiviteter</span>
                          ) : <span className="text-slate-300 text-xs">–</span>}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-blue-600 h-8 w-8 p-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sorted.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-16 text-slate-400">Inga kunder i detta segment</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-white">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-lg">
                      {selected.first_name?.[0]}{selected.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg">{selected.first_name} {selected.last_name}</SheetTitle>
                    {selected.company_name && <p className="text-sm text-slate-500">{selected.company_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className={`${statusColors[selected.status]} text-xs`}>{customerStatusLabels[selected.status]}</Badge>
                  <select value={selected.status} onChange={e => { p.onUpdateCustomer(selected.id, "status", e.target.value); setSelected({ ...selected, status: e.target.value as CustomerStatus }); }} className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {Object.entries(customerStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              </SheetHeader>

              <div className="space-y-5">
                {/* Contact */}
                <div className="space-y-3">
                  {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600"><svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>{selected.email}</a>}
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600"><svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>{selected.phone}</a>}
                </div>

                <Separator />

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>Ring</a>}
                  {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>Maila</a>}
                  <button onClick={() => p.onOpenReminderForm(selected.id)} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>Påminnelse</button>
                  {p.hasQuestionnaire(selected.id) && <button onClick={() => p.onViewResponses(selected.id)} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Formulärsvar</button>}
                </div>

                <Separator />

                {/* Log note */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Logga aktivitet</p>
                  <div className="flex gap-2">
                    <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newNote.trim()) { p.onAddInteraction(selected.id, "note" as InteractionType, newNote); setNewNote(""); } }} placeholder="Skriv en notering..." className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    <Button size="sm" onClick={() => { if (newNote.trim()) { p.onAddInteraction(selected.id, "note" as InteractionType, newNote); setNewNote(""); } }} className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg">Spara</Button>
                  </div>
                </div>

                {/* Reminders */}
                {customerReminders.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Påminnelser</p>
                    <div className="space-y-2">
                      {customerReminders.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-amber-800">{r.title}</p>
                            <p className="text-xs text-amber-600">{p.formatDate(r.reminder_date)}{r.reminder_time && ` kl ${r.reminder_time}`}</p>
                          </div>
                          <button onClick={() => p.onCompleteReminder(r.id)} className="text-amber-400 hover:text-green-600 transition-colors p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity */}
                {customerInteractions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Aktivitetslogg</p>
                    <div className="space-y-3">
                      {customerInteractions.map(ia => (
                        <div key={ia.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons[ia.type] || interactionIcons.other} /></svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">{p.formatDateTime(ia.created_at)}</p>
                            <p className="text-sm text-slate-700">{ia.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
