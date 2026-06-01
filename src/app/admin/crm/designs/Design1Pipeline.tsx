"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { EmailInteractionItem, type EmailPreview } from "@/app/admin/crm/components/EmailInteractionItem";
import gsap from "gsap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Customer, CustomerStatus, customerStatusLabels, InteractionType, ReminderType, reminderTypeLabels } from "@/types/database";
import { LeadSourceIcon } from "@/components/lead-source-icon";
import { DesignProps, ReminderFormData, statusColors, statusDot, interactionIcons } from "./types";
import dynamic from "next/dynamic";
const CustomerModal = dynamic(() => import("@/app/admin/kunder/CustomerModal"), { ssr: false });

export default function Design1Pipeline(p: DesignProps) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState("lead");
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [newNote, setNewNote] = useState("");
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderForm, setReminderForm] = useState<ReminderFormData>({ title: "", date: "", time: "", type: "follow_up" });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{ tone: string; subject: string; message: string }[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [customerEmails, setCustomerEmails] = useState<EmailPreview[]>([]);

  function closeCompose() {
    setShowComposeModal(false);
    setComposeSubject("");
    setComposeMessage("");
    setComposeSending(false);
    setComposeError(null);
    setComposeSuccess(false);
    setSuggestions(null);
    setSuggestError(null);
  }

  async function handleGenerateSuggestions() {
    if (!selected || !composeMessage.trim()) return;
    setSuggesting(true);
    setSuggestions(null);
    setSuggestError(null);
    try {
      const res = await fetch("/api/crm/email/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selected.id,
          draftMessage: composeMessage.trim(),
          ...(composeSubject.trim() && { subject: composeSubject.trim() }),
        }),
      });
      const data = await res.json() as { suggestions?: { tone: string; subject: string; message: string }[]; error?: string };
      if (!res.ok) {
        setSuggestError(data.error ?? "Kunde inte generera förslag");
      } else {
        setSuggestions(data.suggestions ?? null);
      }
    } catch {
      setSuggestError("Nätverksfel, försök igen");
    } finally {
      setSuggesting(false);
    }
  }

  function applySuggestion(s: { subject: string; message: string }) {
    setComposeSubject(s.subject);
    setComposeMessage(s.message);
    setSuggestions(null);
    setSuggestError(null);
  }

  async function handleSendEmail() {
    if (!selected || !composeSubject.trim() || !composeMessage.trim()) return;
    setComposeSending(true);
    setComposeError(null);
    try {
      const res = await fetch("/api/crm/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selected.id,
          subject: composeSubject.trim(),
          message: composeMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposeError(data.error || "Kunde inte skicka mail");
      } else {
        setComposeSuccess(true);
        setTimeout(closeCompose, 1800);
      }
    } catch {
      setComposeError("Nätverksfel, försök igen");
    } finally {
      setComposeSending(false);
    }
  }

  // Lazy-fetch outbound emails for the selected customer (authenticated via RLS)
  useEffect(() => {
    if (!selected) { setCustomerEmails([]); return; }
    const supabase = createClient();
    supabase
      .from("emails")
      .select("id, subject, body_text, from_email, to_email, email_date")
      .eq("customer_id", selected.id)
      .eq("direction", "outbound")
      .order("email_date", { ascending: false })
      .limit(20)
      .then(({ data }) => { setCustomerEmails(data ?? []); });
  }, [selected?.id]);

  const reminderDateObj = reminderForm.date ? new Date(reminderForm.date + "T00:00:00") : undefined;
  const reminderDateLabel = reminderDateObj
    ? reminderDateObj.toLocaleDateString("sv-SE", { day: "numeric", month: "long" })
    : "Välj datum";

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
    { key: "lead", label: "Lead", count: p.customers.filter(c => c.status === "lead").length },
    { key: "contacted", label: "Kontaktat", count: p.customers.filter(c => c.status === "contacted").length },
    { key: "customer", label: "Kund", count: p.customers.filter(c => c.status === "customer").length },
    { key: "churned", label: "Nej", count: p.customers.filter(c => c.status === "churned").length },
  ];

  const filtered = p.customers.filter(c => c.status === activeTab);
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
          <div key={s.label} className="border border-slate-200 rounded-xl bg-white py-3 px-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">{s.label}</p>
            <p data-count={s.count} className={`text-2xl font-bold ${s.color}`}>0</p>
          </div>
        ))}
      </div>

      {/* Tabs + Table */}
      <Card className="border border-slate-200 shadow-none overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelected(null); }}>
          <div className="border-b border-slate-100 px-4 pt-1">
            <TabsList className="bg-transparent h-auto gap-1 p-0">
              {tabs.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="rounded-none border-0 border-b-2 border-transparent shadow-none! data-[state=active]:border-b-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none! px-4 py-3 text-sm font-medium text-slate-500">
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
                            <LeadSourceIcon source={c.source ?? null} size={c.source === "website" ? 25 : 16} className="text-slate-400 opacity-70" />
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
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setShowReminderForm(false); setShowEdit(false); setReminderForm({ title: "", date: "", time: "", type: "follow_up" }); closeCompose(); } }}>
        <SheetContent
          className="w-full sm:max-w-lg overflow-y-auto bg-white p-6"
          onInteractOutside={(e) => { if (showReminderForm || showComposeModal) e.preventDefault(); }}
        >
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
                  <button onClick={() => setShowEdit(true)} className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                    Redigera
                  </button>
                </div>
              </SheetHeader>

              <div className="space-y-5 min-w-0">
                {/* Contact */}
                <div className="space-y-3 min-w-0">
                  {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600 min-w-0"><svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg><span className="truncate">{selected.email}</span></a>}
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600 min-w-0"><svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg><span className="truncate">{selected.phone}</span></a>}
                  {selected.website_url && <a href={selected.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600 min-w-0"><svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" /></svg><span className="truncate">{selected.website_url}</span></a>}
                  {selected.instagram_url && <div className="flex items-center gap-3 text-sm text-slate-700 min-w-0"><svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeLinecap="round" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" /></svg><span className="truncate">{selected.instagram_url}</span></div>}
                  {selected.category && <div className="flex items-center gap-3 text-sm text-slate-500 min-w-0"><svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg><span className="truncate">{selected.category}</span></div>}
                </div>

                <Separator />

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center justify-center gap-1.5 px-2 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-medium hover:bg-green-100 transition-colors"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>Ring</a>}
                  {selected.email ? (
                    <button onClick={() => setShowComposeModal(true)} className="flex items-center justify-center gap-1.5 px-2 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>Maila</button>
                  ) : (
                    <button disabled title="Kunden saknar e-postadress" className="flex items-center justify-center gap-1.5 px-2 py-2 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-xs font-medium cursor-not-allowed"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>Maila</button>
                  )}
                  <button onClick={() => setShowReminderForm(true)} className="flex items-center justify-center gap-1.5 px-2 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-medium hover:bg-amber-100 transition-colors"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>Påminnelse</button>
                  {p.hasQuestionnaire(selected.id) && <button onClick={() => p.onViewResponses(selected.id)} className="flex items-center justify-center gap-1.5 px-2 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-medium hover:bg-indigo-100 transition-colors"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Formulärsvar</button>}
                </div>

                <Separator />

                {/* Log note */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Anteckning</p>
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Skriv en notering..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                  />
                  <button
                    onClick={() => { if (newNote.trim()) { p.onAddInteraction(selected.id, "note" as InteractionType, newNote); setNewNote(""); } }}
                    disabled={!newNote.trim()}
                    className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Spara anteckning
                  </button>
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
                      {customerInteractions.map(ia => {
                        if (ia.type === "email") {
                          const email = ia.email_id
                            ? (customerEmails.find(e => e.id === ia.email_id) ?? null)
                            : null;
                          return (
                            <EmailInteractionItem
                              key={ia.id}
                              interactionId={ia.id}
                              createdAt={ia.created_at}
                              description={ia.description}
                              email={email}
                              formatDateTime={p.formatDateTime}
                              onDelete={() => p.onDeleteInteraction(ia.id)}
                            />
                          );
                        }
                        return (
                          <div key={ia.id} className="flex gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={interactionIcons[ia.type] || interactionIcons.other} /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400">{p.formatDateTime(ia.created_at)}</p>
                              <p className="text-sm text-slate-700">{ia.description}</p>
                            </div>
                            <button
                              onClick={() => p.onDeleteInteraction(ia.id)}
                              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-slate-300 hover:text-rose-500 transition-all rounded"
                              title="Radera"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {/* Compose email modal */}
          {showComposeModal && selected && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { if (!composeSending) closeCompose(); }} />
              <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90svh]">
                <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Nytt mail</p>
                      <p className="text-xs text-slate-400">{selected.first_name} {selected.last_name}</p>
                    </div>
                  </div>
                  <button onClick={() => { if (!composeSending) closeCompose(); }} disabled={composeSending} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="px-5 pb-5 space-y-3 overflow-y-auto flex-1">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Från</p>
                    <input readOnly value="System – info@intenzze.com" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-default" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Till</p>
                    <input readOnly value={selected.email ?? ""} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 cursor-default" />
                  </div>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    placeholder="Ämnesrad..."
                    maxLength={255}
                    disabled={composeSending || composeSuccess}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow disabled:opacity-60"
                  />
                  <div>
                    <textarea
                      value={composeMessage}
                      onChange={e => setComposeMessage(e.target.value)}
                      placeholder="Skriv ditt meddelande..."
                      rows={5}
                      maxLength={10000}
                      disabled={composeSending || composeSuccess}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow resize-none disabled:opacity-60"
                    />
                    <p className="text-xs text-slate-400 text-right mt-0.5">{composeMessage.length}/10 000</p>
                  </div>

                  {/* AI suggestions */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGenerateSuggestions}
                      disabled={suggesting || composeSending || composeSuccess || !composeMessage.trim()}
                      className="w-full py-2 px-3 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-xs font-medium hover:bg-violet-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {suggesting ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Genererar förslag...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          Generera förslag med AI
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-400">
                      AI suggestions may send your draft text to the selected AI provider.
                    </p>
                  </div>

                  {suggestError && (
                    <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      {suggestError}
                    </p>
                  )}

                  {suggestions && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">3 förslag</p>
                        <button
                          type="button"
                          onClick={() => { setSuggestions(null); setSuggestError(null); }}
                          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Dölj
                        </button>
                      </div>
                      {suggestions.map((s, i) => (
                        <div key={i} className="border border-violet-200 bg-violet-50 rounded-xl p-3 space-y-1">
                          <p className="text-xs font-semibold text-violet-600">{s.tone}</p>
                          <p className="text-sm font-medium text-slate-800 truncate">{s.subject}</p>
                          <p className="text-xs text-slate-500 whitespace-pre-wrap">{s.message}</p>
                          <button
                            type="button"
                            onClick={() => applySuggestion(s)}
                            className="mt-1 w-full py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Använd det här
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {composeError && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{composeError}</p>
                  )}
                  {composeSuccess && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Mail skickat!
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={closeCompose} disabled={composeSending} className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors">
                      Avbryt
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={composeSending || composeSuccess || !composeSubject.trim() || !composeMessage.trim()}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      {composeSending ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Skickar...
                        </>
                      ) : "Skicka"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reminder form */}
          {showReminderForm && selected && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReminderForm(false)} />
              <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                      <svg className="w-4.5 h-4.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Ny påminnelse</p>
                      <p className="text-xs text-slate-400">{selected.first_name} {selected.last_name}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowReminderForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="px-5 pb-5 space-y-3">
                  {/* Title */}
                  <input
                    type="text"
                    value={reminderForm.title}
                    onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })}
                    placeholder="Titel, t.ex. Ring kunden..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow"
                  />

                  {/* Date + Time */}
                  <div className="grid grid-cols-2 gap-2">
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button className={`flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent ${reminderForm.date ? "text-slate-800 border-slate-200" : "text-slate-400 border-slate-200"}`}>
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                          <span className="truncate">{reminderDateLabel}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl border border-slate-200 shadow-xl z-[70] -translate-y-50" align="start">
                        <Calendar
                          mode="single"
                          selected={reminderDateObj}
                          onSelect={(d) => {
                            if (d) {
                              const y = d.getFullYear();
                              const m = String(d.getMonth() + 1).padStart(2, "0");
                              const day = String(d.getDate()).padStart(2, "0");
                              setReminderForm({ ...reminderForm, date: `${y}-${m}-${day}` });
                            }
                            setCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>

                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <input
                        type="time"
                        value={reminderForm.time}
                        onChange={e => setReminderForm({ ...reminderForm, time: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow"
                      />
                    </div>
                  </div>

                  {/* Type pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(reminderTypeLabels) as [ReminderType, string][]).map(([k, l]) => (
                      <button
                        key={k}
                        onClick={() => setReminderForm({ ...reminderForm, type: k })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          reminderForm.type === k
                            ? "bg-amber-50 border-amber-300 text-amber-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowReminderForm(false)}
                      className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={() => { p.onAddReminder(selected.id, reminderForm); setShowReminderForm(false); setReminderForm({ title: "", date: "", time: "", type: "follow_up" }); setCalendarOpen(false); }}
                      disabled={!reminderForm.title || !reminderForm.date}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Spara
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {showEdit && selected && (
        <CustomerModal
          customer={selected}
          onClose={() => setShowEdit(false)}
          onSave={(updated) => {
            p.onReplaceCustomer(updated);
            setSelected(updated);
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}
