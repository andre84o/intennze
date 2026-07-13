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
}

export default function QuoteCatalogModal({ customer, onClose, onCreated }: Props) {
  const nextKey = React.useRef(1);
  const [lines, setLines] = React.useState<Line[]>([]);
  const [title, setTitle] = React.useState(
    `Offert – ${customer.company_name || `${customer.first_name} ${customer.last_name}`}`
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const qtyOf = (serviceId: string) =>
    lines.filter((l) => l.serviceId === serviceId).reduce((s, l) => s + l.qty, 0);

  const addServiceTo = (list: Line[], s: Service): Line[] => {
    const existing = list.find((l) => l.serviceId === s.id);
    if (existing) return list.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
    return [...list, { key: nextKey.current++, serviceId: s.id, name: s.name, price: s.price, qty: 1, unit: s.unit, emoji: s.emoji, details: s.details ?? "" }];
  };

  const addService = (s: Service) => {
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

  const addCustom = () =>
    setLines((prev) => [...prev, { key: nextKey.current++, serviceId: null, name: "", price: 0, qty: 1, unit: "st", emoji: "✏️", details: "" }]);

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const setQty = (key: number, qty: number) =>
    qty <= 0 ? setLines((prev) => prev.filter((l) => l.key !== key)) : updateLine(key, { qty });

  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const vatAmount = subtotal * (VAT_RATE / 100);
  const total = subtotal + vatAmount;

  const validLines = lines.filter((l) => l.name.trim() && l.price >= 0 && l.qty > 0);

  const handleSave = async () => {
    if (validLines.length === 0) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const today = new Date();
    const validFrom = today.toISOString().split("T")[0];
    const validUntil = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    try {
      const { data: created, error: createError } = await supabase
        .from("quotes")
        .insert({
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

      const itemsToInsert = validLines.map((l, index) => ({
        quote_id: created.id,
        description: l.name.trim(),
        details: l.details && l.details.trim() ? l.details.trim() : null,
        quantity: l.qty,
        unit: l.unit || "st",
        unit_price: l.price,
        total: l.price * l.qty,
        sort_order: index,
      }));

      const { data: items, error: itemsError } = await supabase
        .from("quote_items")
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      onCreated({ ...created, items: items || [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skapa offerten");
      setSaving(false);
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
              onChange={(e) => setTitle(e.target.value)}
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
                        {/* qty */}
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQty(l.key, l.qty - 1)} className="w-6 h-6 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center text-sm font-bold">−</button>
                          <span className="w-6 text-center text-sm font-semibold text-slate-800">{l.qty}</span>
                          <button onClick={() => setQty(l.key, l.qty + 1)} className="w-6 h-6 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center text-sm font-bold">+</button>
                        </div>
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
                      <p className="text-right text-sm font-semibold text-slate-800 mt-1.5">{fmt(l.price * l.qty)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 bg-white space-y-3 flex-shrink-0">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500"><span>Summa exkl. moms</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Moms {VAT_RATE}%</span><span>{fmt(vatAmount)}</span></div>
                <div className="flex justify-between font-bold text-slate-900 text-base pt-1.5 border-t border-slate-200"><span>Att betala</span><span>{fmt(total)}</span></div>
              </div>
              {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { if (!saving) onClose(); }} disabled={saving} className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors">Avbryt</button>
                <button
                  onClick={handleSave}
                  disabled={saving || validLines.length === 0}
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
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
