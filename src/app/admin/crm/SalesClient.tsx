"use client";

import { useEffect, useState } from "react";
import { Customer, CustomerStatus, Reminder, CustomerInteraction, InteractionType, Quote } from "@/types/database";
import { createClient } from "@/utils/supabase/client";
import { buildCallQueue, stockholmToday, type QueueReminder } from "@/lib/nextLead";
import { DesignProps, Questionnaire, ReminderFormData } from "./designs/types";
import Design1Pipeline from "./designs/Design1Pipeline";

function upsertById<T extends { id: string }>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [row, ...list];
  const copy = [...list];
  copy[i] = { ...copy[i], ...row };
  return copy;
}
function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

interface Props {
  customers: Customer[];
  reminders: Reminder[];
  interactions: CustomerInteraction[];
  questionnaires: Questionnaire[];
  quotes: Quote[];
  error?: string;
}


const isServiceExpired = (c: Customer) => {
  if (!c.has_service_agreement || !c.service_renewal_date) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(c.service_renewal_date); d.setHours(0, 0, 0, 0);
  return d < today;
};

export default function SalesClient({ customers: init, reminders: initR, interactions: initI, questionnaires: initQ, quotes: initQuotes, error }: Props) {
  const [customers, setCustomers] = useState(init);
  const [reminders, setReminders] = useState(initR);
  const [interactions, setInteractions] = useState(initI);
  const [questionnaires, setQuestionnaires] = useState(initQ);
  const [quotes, setQuotes] = useState(initQuotes);
  const [savingCustomer, setSavingCustomer] = useState<string | null>(null);
  const [sendingQuestionnaire, setSendingQuestionnaire] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState<{ show: boolean; email?: string }>({ show: false });
  const [showResponsesPopup, setShowResponsesPopup] = useState<string | null>(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<Record<string, unknown> | null>(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [showQuestionsHelper, setShowQuestionsHelper] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // ── Realtime ───────────────────────────────────────────────────────────────
  // Keeps the desktop in sync across tabs/devices (incl. Mobile Call Companion
  // outcomes) without a refresh. These handlers ONLY update local state — they
  // never trigger /api/meta/conversion or any other side effect.
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel("crm-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, (p) => {
        if (p.eventType === "DELETE") setCustomers((prev) => removeById(prev, (p.old as { id: string }).id));
        else setCustomers((prev) => upsertById(prev, p.new as Customer));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_interactions" }, (p) => {
        if (p.eventType === "DELETE") setInteractions((prev) => removeById(prev, (p.old as { id: string }).id));
        else setInteractions((prev) => upsertById(prev, p.new as CustomerInteraction));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, (p) => {
        if (p.eventType === "DELETE") setReminders((prev) => removeById(prev, (p.old as { id: string }).id));
        else setReminders((prev) => upsertById(prev, p.new as Reminder));
      })
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCustomerReminders = (id: string) => reminders.filter(r => r.customer_id === id && !r.is_completed).sort((a, b) => a.reminder_date.localeCompare(b.reminder_date));
  const getNextReminder = (id: string) => getCustomerReminders(id)[0] || null;
  const getCustomerInteractions = (id: string) => interactions.filter(i => i.customer_id === id).slice(0, 8);
  const getCustomerQuotes = (id: string) => quotes.filter(q => q.customer_id === id);
  const hasOverdueReminder = (id: string) => reminders.some(r => r.customer_id === id && !r.is_completed && r.reminder_date < today);
  const hasTodayReminder = (id: string) => reminders.some(r => r.customer_id === id && !r.is_completed && r.reminder_date === today);
  const hasQuestionnaire = (id: string) => questionnaires.some(q => q.customer_id === id);
  // Prioritised calling queue, seeds the Mobile Call Companion session.
  // Uses Europe/Stockholm "today" so it matches the server-side predicate.
  const getCallQueue = () => {
    const remByCustomer = new Map<string, QueueReminder[]>();
    for (const r of reminders) {
      if (!r.customer_id) continue;
      const arr = remByCustomer.get(r.customer_id) ?? [];
      arr.push({ reminder_date: r.reminder_date, reminder_time: r.reminder_time, is_completed: r.is_completed });
      remByCustomer.set(r.customer_id, arr);
    }
    return buildCallQueue(
      customers.map(c => ({ id: c.id, status: c.status, phone: c.phone })),
      remByCustomer,
      stockholmToday(),
    );
  };
  const formatDate = (s: string) => new Date(s).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  const formatDateTime = (s: string) => new Date(s).toLocaleDateString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const onUpdateCustomer = async (id: string, field: string, value: string) => {
    setSavingCustomer(id);
    const sb = createClient();
    const prev = customers.find(c => c.id === id)?.status;
    const { error } = await sb.from("customers").update({ [field]: value }).eq("id", id);
    if (!error) {
      setCustomers(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));
      if (field === "status" && prev !== value) {
        try { await fetch("/api/meta/conversion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: id, previousStatus: prev }) }); } catch {}
      }
    }
    setSavingCustomer(null);
  };

  const onUpdateCustomerBoolean = async (id: string, field: string, value: boolean) => {
    setSavingCustomer(id);
    const sb = createClient();
    const { error } = await sb.from("customers").update({ [field]: value }).eq("id", id);
    if (!error) setCustomers(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));
    setSavingCustomer(null);
  };

  const onAddInteraction = async (customerId: string, type: InteractionType, description: string) => {
    if (!description.trim()) return;
    const sb = createClient();
    const { data, error } = await sb.from("customer_interactions").insert({ customer_id: customerId, type, description }).select().single();
    if (!error && data) setInteractions(p => [data, ...p]);
  };

  const onDeleteInteraction = async (id: string) => {
    const sb = createClient();
    const { error } = await sb.from("customer_interactions").delete().eq("id", id);
    if (!error) setInteractions(p => p.filter(i => i.id !== id));
  };

  const onAddReminder = async (customerId: string, form: ReminderFormData) => {
    if (!form.title || !form.date) return;
    const sb = createClient();
    const { data, error } = await sb.from("reminders").insert({ customer_id: customerId, title: form.title, reminder_date: form.date, reminder_time: form.time || null, type: form.type }).select().single();
    if (!error && data) { setReminders(p => [...p, data]); }
  };

  const onCompleteReminder = async (id: string) => {
    const sb = createClient();
    const { error } = await sb.from("reminders").update({ is_completed: true, completed_at: new Date().toISOString() }).eq("id", id);
    if (!error) setReminders(p => p.map(r => r.id === id ? { ...r, is_completed: true } : r));
  };

  const onSendQuestionnaire = async (id: string) => {
    setSendingQuestionnaire(id);
    const customer = customers.find(c => c.id === id);
    try {
      const res = await fetch("/api/questionnaire/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: id }) });
      const result = await res.json();
      if (res.ok) {
        if (result.questionnaireId) setQuestionnaires(p => [...p, { id: result.questionnaireId, customer_id: id, status: "sent" }]);
        setShowSuccessPopup({ show: true, email: customer?.email ?? undefined });
        setTimeout(() => setShowSuccessPopup({ show: false }), 4000);
      } else alert(`Fel: ${result.error}`);
    } catch { alert("Fel vid skickande."); }
    finally { setSendingQuestionnaire(null); }
  };

  const onViewResponses = async (customerId: string) => {
    setShowResponsesPopup(customerId); setLoadingResponses(true); setQuestionnaireResponses(null);
    const sb = createClient();
    const { data: q } = await sb.from("questionnaires").select("id, status, sent_at, completed_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(1).single();
    if (q) {
      const { data: r } = await sb.from("questionnaire_responses").select("*").eq("questionnaire_id", q.id).single();
      setQuestionnaireResponses({ ...r, questionnaire_status: q.status, sent_at: q.sent_at, completed_at: q.completed_at });
    }
    setLoadingResponses(false);
  };

  const onReplaceCustomer = (c: Customer) => {
    setCustomers(p => p.map(x => x.id === c.id ? c : x));
  };

  const onMarkRead = async (id: string) => {
    const c = customers.find(c => c.id === id);
    if (c && !c.is_read) {
      const sb = createClient();
      await sb.from("customers").update({ is_read: true }).eq("id", id);
      setCustomers(p => p.map(c => c.id === id ? { ...c, is_read: true } : c));
    }
  };

  const onQuoteCreated = (quote: Quote) => {
    setQuotes(p => [quote, ...p]);
  };

  const onDeleteQuote = async (id: string) => {
    const sb = createClient();
    const { error } = await sb.from("quotes").delete().eq("id", id);
    if (!error) setQuotes(p => p.filter(q => q.id !== id));
  };

  const onQuoteSent = (id: string, email: string) => {
    setQuotes(p => p.map(q => q.id === id
      ? { ...q, status: "sent", sent_at: new Date().toISOString(), sent_to_email: email }
      : q));
  };

  const designProps: DesignProps = {
    customers, reminders, interactions, questionnaires, quotes, today,
    savingCustomer, sendingQuestionnaire,
    getCustomerReminders, getCustomerInteractions, getNextReminder,
    hasOverdueReminder, hasTodayReminder, hasQuestionnaire, getCallQueue, getCustomerQuotes, isServiceExpired,
    formatDate, formatDateTime,
    onUpdateCustomer, onUpdateCustomerBoolean,
    onAddInteraction, onAddReminder, onCompleteReminder,
    onSendQuestionnaire, onViewResponses, onMarkRead,
    onDeleteInteraction, onReplaceCustomer,
    onQuoteCreated, onDeleteQuote, onQuoteSent,
  };

  return (
    <div className="bg-slate-50 min-h-screen -m-3 sm:-m-6 p-4 sm:p-6 overflow-x-hidden">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CRM</h1>
          <p className="text-sm text-slate-400 mt-0.5">Hantera leads och kunduppföljning</p>
        </div>
        <button onClick={() => setShowQuestionsHelper(true)} title="Formulärfrågor" className="flex items-center justify-center w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 shadow-sm transition-colors self-start">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
        </button>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      <Design1Pipeline {...designProps} />

{/* ── Success popup ───────────────────────────────────────────────────── */}
      {showSuccessPopup.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowSuccessPopup({ show: false })} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Formulär skickat!</h3>
            {showSuccessPopup.email && <p className="text-slate-500 text-sm mb-4">Skickat till <span className="font-medium">{showSuccessPopup.email}</span></p>}
            <button onClick={() => setShowSuccessPopup({ show: false })} className="px-5 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">Okej</button>
          </div>
        </div>
      )}

      {/* ── Questionnaire responses popup ──────────────────────────────────── */}
      {showResponsesPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowResponsesPopup(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Formulärsvar</h2>
              <button onClick={() => setShowResponsesPopup(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingResponses ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
              : !questionnaireResponses ? <p className="text-center text-slate-400 py-12">Kunden har inte svarat ännu.</p>
              : (
                <div className="space-y-4">
                  {(() => { const s = questionnaireResponses.questionnaire_status as string; return <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${s === "completed" ? "bg-green-100 text-green-700" : s === "opened" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{s === "completed" ? "Besvarad" : s === "opened" ? "Öppnad" : "Skickad"}</div>; })()}
                  {typeof questionnaireResponses.industry === "string" && questionnaireResponses.industry && <div className="p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bransch</p><p className="font-medium text-slate-800">{questionnaireResponses.industry}</p></div>}
                  {typeof questionnaireResponses.design_preferences === "string" && questionnaireResponses.design_preferences && <div className="p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Designönskemål</p><p className="text-slate-700">{questionnaireResponses.design_preferences}</p></div>}
                  {typeof questionnaireResponses.timeline === "string" && questionnaireResponses.timeline && <div className="p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tidslinje</p><p className="font-medium text-slate-800">{({"asap":"Så snart som möjligt","1-2weeks":"1-2 veckor","1month":"Inom 1 månad","2-3months":"2-3 månader","flexible":"Flexibel"} as Record<string,string>)[questionnaireResponses.timeline as string] || questionnaireResponses.timeline}</p></div>}
                  {typeof questionnaireResponses.additional_info === "string" && questionnaireResponses.additional_info && <div className="p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Övrigt</p><p className="text-slate-700">{questionnaireResponses.additional_info}</p></div>}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-6 py-4"><button onClick={() => setShowResponsesPopup(null)} className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700">Stäng</button></div>
          </div>
        </div>
      )}

      {/* ── Questions helper ────────────────────────────────────────────────── */}
      {showQuestionsHelper && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-white">Formulärfrågor</h2><p className="text-blue-200 text-sm">Stöd vid kundsamtal</p></div>
              <button onClick={() => setShowQuestionsHelper(false)} className="p-2 hover:bg-white/20 rounded-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {[
                { n: 1, title: "Om verksamheten", items: ["Företagsnamn & org.nummer", "Kontaktperson & befattning", "Bransch", "Domän – har de en? Vill de ha hjälp?"] },
                { n: 2, title: "Underhåll & Omfattning", items: ["Ska vi sköta underhåll?", "Antal sidor: 1-3 / 4-7 / 8-15 / 15+"] },
                { n: 3, title: "Innehåll & Design", items: ["Bilder & texter klara?", "Designönskemål – stil, färger, känsla", "Referenssidor de gillar"] },
                { n: 4, title: "Funktioner", items: ["Kontaktformulär, bokning, webshop, blogg, galleri, sociala medier, nyhetsbrev, karta, FAQ…"] },
                { n: 5, title: "Tidslinje", items: ["ASAP / 1-2v / 1 mån / 2-3 mån / Flexibel", "Övrig info"] },
              ].map(s => (
                <div key={s.n} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{s.n}</span>{s.title}</h3>
                  <ul className="space-y-1.5">{s.items.map((item, i) => <li key={i} className="text-sm text-slate-600 flex items-start gap-2"><span className="text-blue-400 mt-0.5 flex-shrink-0">›</span>{item}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100"><button onClick={() => setShowQuestionsHelper(false)} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Stäng</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
