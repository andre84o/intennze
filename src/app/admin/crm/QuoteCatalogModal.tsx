"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { Quote } from "@/types/database";

/* ==========================================================================
   Tjänstekatalog — skapa offert direkt på en kund (CRM).
   Katalog fyller i standardpris; pris/antal går att justera per rad och
   egen fri rad kan läggas till. Sparar quotes + quote_items via RLS.
   ========================================================================== */

interface CatalogCustomer {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
  email?: string | null;
}

interface Props {
  customer: CatalogCustomer;
  onClose: () => void;
  onCreated: (quote: Quote) => void;
  onSent: (id: string, email: string) => void;
  onDiscard: (id: string) => void;
  onCompanyUpdated: (name: string) => void;
}

interface Service {
  id: string;
  name: string;
  desc: string;
  price: number;
  unit: string;
  emoji: string;
  details?: string;
}

// Färdiga paket — priser exkl. moms, enligt prissidan.
const PACKAGES: Service[] = [
  {
    id: "pkg-start",
    name: "Webbplats – Start",
    desc: "Enkel närvaro, one-page",
    price: 5000,
    unit: "st",
    emoji: "🚀",
    details: "Landningssida (one-page), responsiv design, kontaktformulär, teknisk SEO, Google Maps, koppling till sociala medier, driftsättning, 14 dagars support.",
  },
  {
    id: "pkg-standard",
    name: "Webbplats – Standard",
    desc: "För växande företag",
    price: 10000,
    unit: "st",
    emoji: "⭐",
    details: "Upp till 5 sidor, anpassad design, redigera texter och bilder själv, förhandsgranska innan publicering, teknisk SEO, Google Maps & företagsprofil, bildoptimering, 30 dagars support.",
  },
  {
    id: "pkg-premium",
    name: "Webbplats – Premium",
    desc: "Skräddarsydd lösning (från)",
    price: 25000,
    unit: "st",
    emoji: "👑",
    details: "Upp till 15 sidor, bokningssystem eller kundportal, redigera själv, förhandsgranska, Stripe-betalningar, integration mot externa tjänster, teknisk SEO, flerspråkig webbplats, 60 dagars support.",
  },
];

// Drift & support-beskrivning — antalet supporttillfällen/mån beror på paket.
const careDetails = (support: number) =>
  [
    "Hemsidan hålls online",
    "Säkerhetsuppdateringar",
    "Automatisk backup",
    "SSL-certifikat ingår",
    `${support} Teknisk support vid problem / mån`,
    "Hjälp med domänkoppling",
    "Hosting",
  ].join("\n");

// Antal supporttillfällen/mån per paket (övriga paket → 2).
const carePremiumSupport = 4;
const careDefaultSupport = 2;

// Tillägg — pris kan justeras per rad.
const ADDONS: Service[] = [
  { id: "care", name: "Drift & support", desc: "Löpande drift & support", price: 299, unit: "mån", emoji: "🛠️", details: careDetails(careDefaultSupport) },
  { id: "page", name: "Extra sida", desc: "Utöver de som ingår", price: 1500, unit: "st", emoji: "📄" },
  { id: "booking", name: "Bokningssystem", desc: "Kunder bokar direkt på sajten", price: 4900, unit: "st", emoji: "📅" },
  { id: "shop", name: "Webshop / Stripe", desc: "Sälj & ta betalt online", price: 9900, unit: "st", emoji: "🛒" },
  { id: "seo", name: "SEO-grund", desc: "Synas bättre på Google", price: 3900, unit: "st", emoji: "🔍" },
  { id: "logo", name: "Logotyp", desc: "Ny logotyp & profil", price: 2500, unit: "st", emoji: "✨" },
];

// Läggs till automatiskt när ett paket väljs.
const CARE_ADDON = ADDONS.find((a) => a.id === "care")!;
const isPackage = (id: string | null) => !!id && id.startsWith("pkg-");

const VAT_RATE = 25;

const DEFAULT_TERMS =
  "Offerten gäller i 10 dagar från offertdatum.\n\nBetalning: 50% vid start, 50% vid leverans. Betalningsvillkor: 10 dagar netto.\n\nLeverans och tidsplan: Leveransdatum räknas från den dag då första delbetalningen är mottagen och allt nödvändigt material har levererats av Uppdragsgivaren.\n\nFakturering och betalningshantering sker via Utbetalning Sverige AB (org.nr 559484 9407) genom Utbetalning.com. Tjänsten utförs av Intenzze Webbstudio.";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

interface Line {
  key: number;
  serviceId: string | null; // null = custom row
  name: string;
  price: number;
  qty: number;
  unit: string;
  emoji: string;
  details?: string;
  discount: number; // rabatt per rad
  discountType: "kr" | "%";
}

const lineGross = (l: Line) => l.price * l.qty;
const lineDiscount = (l: Line) => {
  const g = lineGross(l);
  const d = l.discountType === "%" ? g * (l.discount / 100) : l.discount;
  return Math.max(0, Math.min(d, g));
};
const lineNet = (l: Line) => lineGross(l) - lineDiscount(l);

export default function QuoteCatalogModal({ customer, onClose, onCreated, onSent, onDiscard, onCompanyUpdated }: Props) {
  const nextKey = React.useRef(1);
  const [lines, setLines] = React.useState<Line[]>([]);
  const [title, setTitle] = React.useState(
    `Offert – ${customer.company_name?.trim() || `${customer.first_name} ${customer.last_name}`.trim()}`
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<Quote | null>(null);
  const [sending, setSending] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [company, setCompany] = React.useState(customer.company_name?.trim() || "");
  const [companyInput, setCompanyInput] = React.useState("");
  const [savingCompany, setSavingCompany] = React.useState(false);
  const hasCompany = !!company;

  const saveCompany = async () => {
    const name = companyInput.trim();
    if (!name) return;
    setSavingCompany(true);
    setError(null);
    const supabase = createClient();
    const { error: updErr } = await supabase.from("customers").update({ company_name: name }).eq("id", customer.id);
    setSavingCompany(false);
    if (updErr) {
      setError("Kunde inte spara företagsnamnet.");
      return;
    }
    setCompany(name);
    onCompanyUpdated(name);
    // Uppdatera titeln om den fortfarande är standard (personnamnet).
    const personDefault = `Offert – ${`${customer.first_name} ${customer.last_name}`.trim()}`;
    setTitle((t) => (t === personDefault ? `Offert – ${name}` : t));
  };

  // Om offerten redan skapats och användaren ändrar något: kasta utkastet
  // (ta bort det) och gå tillbaka till "Skapa offert"-läget.
  const revertToDraft = () => {
    if (created) {
      onDiscard(created.id);
      setCreated(null);
      setError(null);
    }
  };

  const qtyOf = (serviceId: string) =>
    lines.filter((l) => l.serviceId === serviceId).reduce((s, l) => s + l.qty, 0);

  const addServiceTo = (list: Line[], s: Service): Line[] => {
    const existing = list.find((l) => l.serviceId === s.id);
    if (existing) {
      // Endast Extra sida kan ha fler än 1 — övriga tjänster ligger kvar som de är.
      if (s.id === "page") return list.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
      return list;
    }
    return [...list, { key: nextKey.current++, serviceId: s.id, name: s.name, price: s.price, qty: 1, unit: s.unit, emoji: s.emoji, details: s.details ?? "", discount: 0, discountType: "kr" }];
  };

  const addService = (s: Service) => {
    revertToDraft();
    setLines((prev) => {
      let next = addServiceTo(prev, s);
      // När ett paket väljs: lägg till Drift & support med rätt antal supporttillfällen/mån.
      if (isPackage(s.id)) {
        const details = careDetails(s.id === "pkg-premium" ? carePremiumSupport : careDefaultSupport);
        if (next.some((l) => l.serviceId === CARE_ADDON.id)) {
          next = next.map((l) => (l.serviceId === CARE_ADDON.id ? { ...l, details } : l));
        } else {
          next = addServiceTo(next, { ...CARE_ADDON, details });
        }
      }
      return next;
    });
  };

  const addCustom = () => {
    revertToDraft();
    setLines((prev) => [...prev, { key: nextKey.current++, serviceId: null, name: "", price: 0, qty: 1, unit: "st", emoji: "✏️", details: "", discount: 0, discountType: "kr" }]);
  };

  const updateLine = (key: number, patch: Partial<Line>) => {
    revertToDraft();
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const setQty = (key: number, qty: number) => {
    revertToDraft();
    return qty <= 0 ? setLines((prev) => prev.filter((l) => l.key !== key)) : updateLine(key, { qty });
  };

  const removeLine = (key: number) => {
    revertToDraft();
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const totalDiscount = lines.reduce((s, l) => s + lineDiscount(l), 0);
  const subtotal = lines.reduce((s, l) => s + lineNet(l), 0); // netto efter radrabatter
  const vatAmount = subtotal * (VAT_RATE / 100);
  const total = subtotal + vatAmount;

  const validLines = lines.filter((l) => l.name.trim() && l.price >= 0 && l.qty > 0);

  // Rader så som de sparas/visas för kunden. total = netto efter rabatt.
  const previewItems = validLines.map((l) => ({
    description: l.name.trim() || "—",
    details: l.details && l.details.trim() ? l.details.trim() : "",
    quantity: l.qty,
    unit: l.unit || "st",
    unit_price: l.price,
    total: lineNet(l),
  }));
  const previewValidUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE");

  const handleSave = async () => {
    if (validLines.length === 0) return;
    if (!hasCompany) {
      setError("Kunden saknar företagsnamn. Lägg till det på kunden innan du skapar offerten.");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("Du måste vara inloggad.");
      setSaving(false);
      return;
    }

    const today = new Date();
    const validFrom = today.toISOString().split("T")[0];
    const validUntil = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    try {
      const { data: created, error: createError } = await supabase
        .from("quotes")
        .insert({
          owner_user_id: user.id,
          created_by: user.id,
          customer_id: customer.id,
          title: title.trim() || "Offert",
          description: null,
          valid_from: validFrom,
          valid_until: validUntil,
          vat_rate: VAT_RATE,
          subtotal,
          vat_amount: vatAmount,
          total,
          notes: null,
          terms: DEFAULT_TERMS,
        })
        .select("*, customer:customers(*)")
        .single();

      if (createError) throw createError;

      const itemsToInsert: {
        quote_id: string;
        description: string;
        details: string | null;
        quantity: number;
        unit: string;
        unit_price: number;
        total: number;
        sort_order: number;
      }[] = [];

      validLines.forEach((l) => {
        // total = netto efter radrabatt. Rabatten härleds i vyerna som
        // (unit_price * quantity) − total, och visas som en egen grön not.
        itemsToInsert.push({
          quote_id: created.id,
          description: l.name.trim(),
          details: l.details && l.details.trim() ? l.details.trim() : null,
          quantity: l.qty,
          unit: l.unit || "st",
          unit_price: l.price,
          total: lineNet(l),
          sort_order: itemsToInsert.length,
        });
      });

      const { data: items, error: itemsError } = await supabase
        .from("quote_items")
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      const fullQuote = { ...created, items: items || [] } as Quote;
      onCreated(fullQuote);
      setCreated(fullQuote);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skapa offerten");
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!created) return;
    if (!customer.email) {
      setError("Kunden saknar e-postadress.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/quote/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: created.id }),
      });
      const data = await res.json();
      if (res.ok) {
        onSent(created.id, customer.email);
        onClose();
      } else {
        setError(data.error || "Kunde inte skicka offerten");
        setSending(false);
      }
    } catch {
      setError("Nätverksfel — försök igen");
      setSending(false);
    }
  };

  const renderServiceCard = (s: Service) => {
    const q = qtyOf(s.id);
    return (
      <button
        key={s.id}
        onClick={() => addService(s)}
        className={`text-left p-3 rounded-xl border transition-all ${q ? "border-blue-400 bg-blue-50/50 ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-slate-300"}`}
      >
        <div className="flex items-start justify-between">
          <span className="text-2xl">{s.emoji}</span>
          {q > 0 && <span className="min-w-6 h-6 px-1.5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{q}</span>}
        </div>
        <p className="text-sm font-semibold text-slate-800 mt-2">{s.name}</p>
        <p className="text-xs text-slate-400 leading-snug">{s.desc}</p>
        <p className="text-sm font-bold text-slate-900 mt-1.5">{fmt(s.price)}{!isPackage(s.id) && <span className="text-xs font-normal text-slate-400"> / {s.unit}</span>}</p>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => { if (!saving) onClose(); }}
      />
      <motion.div
        className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92svh]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Ny offert</p>
              <p className="text-xs text-slate-400 truncate">{customer.first_name} {customer.last_name}{customer.company_name ? ` · ${customer.company_name}` : ""}</p>
            </div>
          </div>
          <button onClick={() => { if (!saving) onClose(); }} disabled={saving} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row min-h-0 flex-1">
          {/* Catalog */}
          <div className="flex-1 overflow-y-auto p-5">
            <input
              value={title}
              onChange={(e) => { revertToDraft(); setTitle(e.target.value); }}
              placeholder="Titel på offerten"
              className="w-full mb-4 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Paket</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
              {PACKAGES.map(renderServiceCard)}
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tillägg</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ADDONS.map(renderServiceCard)}
            </div>
            <button onClick={addCustom} className="mt-3 w-full py-2.5 border border-dashed border-slate-300 text-slate-500 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-400 transition-colors">
              + Egen rad
            </button>
          </div>

          {/* Cart / receipt */}
          <div className="lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50 flex flex-col min-h-0">
            <div className="p-5 flex-1 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Din offert</p>
              {lines.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">Inget valt ännu.<br />Klicka på tjänsterna till vänster.</p>
              ) : (
                <div className="space-y-2">
                  {lines.map((l) => (
                    <div key={l.key} className="bg-white border border-slate-200 rounded-xl p-2.5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <input
                          value={l.name}
                          onChange={(e) => updateLine(l.key, { name: e.target.value })}
                          placeholder="Tjänst…"
                          className="flex-1 min-w-0 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button onClick={() => removeLine(l.key)} className="text-slate-300 hover:text-rose-500 p-0.5 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {l.details !== undefined && (
                        <textarea
                          value={l.details}
                          onChange={(e) => updateLine(l.key, { details: e.target.value })}
                          rows={4}
                          placeholder="Vad ingår…"
                          className="w-full mb-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y min-h-20"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        {/* qty — endast för Extra sida */}
                        {l.serviceId === "page" && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setQty(l.key, l.qty - 1)} className="w-6 h-6 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center text-sm font-bold">−</button>
                            <span className="w-6 text-center text-sm font-semibold text-slate-800">{l.qty}</span>
                            <button onClick={() => setQty(l.key, l.qty + 1)} className="w-6 h-6 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center text-sm font-bold">+</button>
                          </div>
                        )}
                        {/* price */}
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={l.price === 0 ? "" : l.price}
                            onChange={(e) => updateLine(l.key, { price: parseFloat(e.target.value) || 0 })}
                            placeholder="Pris"
                            className="w-full pl-2 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">kr</span>
                        </div>
                      </div>
                      {/* rabatt per rad */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-400 flex-1">Rabatt</span>
                        <div className="relative w-24">
                          <input
                            type="number"
                            value={l.discount === 0 ? "" : l.discount}
                            onChange={(e) => updateLine(l.key, { discount: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full pl-2 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                          <button type="button" onClick={() => updateLine(l.key, { discountType: "kr" })} className={`px-2 py-1 transition-colors ${l.discountType === "kr" ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>kr</button>
                          <button type="button" onClick={() => updateLine(l.key, { discountType: "%" })} className={`px-2 py-1 transition-colors ${l.discountType === "%" ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>%</button>
                        </div>
                      </div>
                      <div className="text-right mt-1.5">
                        {lineDiscount(l) > 0 && (
                          <span className="text-xs text-emerald-600 mr-2">−{fmt(lineDiscount(l))}</span>
                        )}
                        <span className="text-sm font-semibold text-slate-800">{fmt(lineNet(l))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 bg-white space-y-3 flex-shrink-0">
              <div className="space-y-1.5 text-sm">
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Total rabatt</span><span>−{fmt(totalDiscount)}</span></div>
                )}
                <div className="flex justify-between text-slate-500"><span>Summa exkl. moms</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Moms {VAT_RATE}%</span><span>{fmt(vatAmount)}</span></div>
                <div className="flex justify-between font-bold text-slate-900 text-base pt-1.5 border-t border-slate-200"><span>Att betala</span><span>{fmt(total)}</span></div>
              </div>
              {created && !error && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Offert #{created.quote_number} skapad.{customer.email ? " Skicka den till kunden." : " Kunden saknar e-postadress."}
                </p>
              )}
              {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
              {!hasCompany && !created && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-2">
                  <p className="text-xs text-amber-800 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    Kunden saknar företagsnamn — fyll i det för att skapa offert.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveCompany(); }}
                      placeholder="Företagsnamn"
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={saveCompany}
                      disabled={savingCompany || !companyInput.trim()}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {savingCompany ? "Sparar…" : "Spara"}
                    </button>
                  </div>
                </div>
              )}
              {validLines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="w-full py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Förhandsgranska
                </button>
              )}
              {!created ? (
                <div className="flex gap-2">
                  <button onClick={() => { if (!saving) onClose(); }} disabled={saving} className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors">Avbryt</button>
                  <button
                    onClick={handleSave}
                    disabled={saving || validLines.length === 0 || !hasCompany}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Skapar…
                      </>
                    ) : "Skapa offert"}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { if (!sending) onClose(); }} disabled={sending} className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors">Stäng</button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !customer.email}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    {sending ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Skickar…
                      </>
                    ) : "Skicka offert"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Förhandsgranskning — så här ser kunden offerten */}
      {showPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white">
              <p className="text-sm font-semibold text-slate-900">Förhandsgranskning · så här ser kunden offerten</p>
              <button onClick={() => setShowPreview(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 bg-slate-100">
              {/* Gradient-header som i mejlet */}
              <div className="rounded-t-xl px-6 py-7 bg-gradient-to-br from-cyan-500 to-violet-500 text-white">
                <h2 className="text-2xl font-bold">Offert{created ? ` #${created.quote_number}` : ""}</h2>
                <p className="opacity-90 mt-1">{title}</p>
              </div>

              <div className="bg-white border border-slate-200 border-t-0 px-6 py-6 text-sm text-slate-700">
                <p>Hej {customer.first_name},</p>
                <p className="mt-2 text-slate-600">Tack för ditt intresse! Här kommer offerten som vi diskuterat.</p>

                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                        <th className="py-2 font-semibold">Beskrivning</th>
                        <th className="py-2 pl-4 font-semibold text-center">Antal</th>
                        <th className="py-2 pl-8 font-semibold text-right">Á-pris</th>
                        <th className="py-2 pl-8 font-semibold text-right">Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((it, i) => {
                        const gross = it.unit_price * it.quantity;
                        const disc = gross - it.total;
                        return (
                          <tr key={i} className="border-b border-slate-100 align-top">
                            <td className="py-2 pr-2">
                              <p className="font-medium text-slate-800">{it.description}</p>
                              {it.details && <p className="text-xs text-slate-500 whitespace-pre-line mt-0.5">{it.details}</p>}
                              {disc > 0 && <p className="text-xs text-green-700 mt-0.5">Rabatt −{fmt(disc)}</p>}
                            </td>
                            <td className="py-2 pl-4 text-center text-slate-500 whitespace-nowrap">{it.unit === "mån" ? "Löpande" : `${it.quantity} ${it.unit}`}</td>
                            <td className="py-2 pl-8 text-right text-slate-600 whitespace-nowrap">{fmt(it.unit_price)}{it.unit === "mån" ? "/mån" : ""}</td>
                            <td className="py-2 pl-8 text-right whitespace-nowrap font-medium text-slate-800">{fmt(it.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-4 pt-3 border-t-2 border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-slate-500"><span>Subtotal (exkl. moms)</span><span>{fmt(subtotal)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Moms ({VAT_RATE}%)</span><span>{fmt(vatAmount)}</span></div>
                    <div className="flex justify-between font-bold text-slate-900 text-base pt-1.5 border-t-2 border-slate-800"><span>Totalt</span><span>{fmt(total)}</span></div>
                  </div>
                </div>

                <div className="mt-5 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-amber-800">
                  <strong>Giltig t.o.m.:</strong> {created?.valid_until || previewValidUntil}
                </div>

                <div className="mt-5 pt-5 border-t border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-2">Villkor</h3>
                  <p className="text-slate-500 text-xs whitespace-pre-line">{DEFAULT_TERMS}</p>
                </div>

                <div className="mt-6 rounded-xl bg-emerald-50 text-center px-6 py-6">
                  <p className="font-semibold text-emerald-800 mb-3">Är du redo att gå vidare?</p>
                  <span className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold text-sm">Se offert och godkänn</span>
                  <p className="text-xs text-slate-400 mt-3">Knappen är aktiv i mejlet kunden får.</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-3">
              <button onClick={() => setShowPreview(false)} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors">Stäng förhandsgranskning</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
