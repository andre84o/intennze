"use client";

import { useState } from "react";

type Tier = {
	id: string;
	name: string;
	price: string;
	period?: string;
	color: "rose" | "violet" | "emerald" | "sky" | "amber" | "fuchsia" | "indigo";
	features: string[];
	cta: string;
};

const oneTimeTiers: Tier[] = [
	{
		id: "budget",
		name: "Hemsida Budget",
		price: "2 000 kr",
		color: "amber",
		features: [
			"För dig som vill komma igång billigt.",
			"1 undersida (ram & layout)",
			"Enkel, ren design (en färgpalett + typsnitt)",
			"Platshållartexter och platshållarbilder",
			"1 samlad minirevision (mindre justeringar)",
			"Förhandsvisning online",
		],
		cta: "Beställ",
	},
	{
		id: "liten",
		name: "Hemsida Liten (Komplett)",
		price: "5 000 kr",
		color: "rose",
		features: [
			"1–3 undersidor",
			"Mobilanpassad/Responsiv design",
			"Inläggning av dina texter (upp till 1 200 ord)",
			"Bildhjälp: upp till 6 royaltyfria bilder",
			"Byggt med modern webbutveckling för snabb laddning och enkel vidareutveckling",
			"1 kontaktformulär + tack‑sida",
			"Grundläggande SEO (titel, beskrivning, rubriker, alt‑texter)",
			"Koppling till karta och sociala medier",
			"2 revisionsrundor",
			"Publicering och genomgång (30 min)",
			"Personlig kontakt",
		],
		cta: "Beställ",
	},
	{
		id: "mellan",
		name: "Hemsida Mellan (Komplett)",
		price: "7 000 kr",
		color: "indigo",
		features: [
			"Lite större innehåll och fler sektioner.",
			"4–7 undersidor",
			"Mobilanpassad/Responsiv design",
			"Byggt med modern webbutveckling för snabb laddning och enkel vidareutveckling",
			"Inläggning av dina texter",
			"Bildhjälp: upp till 10 bilder",
			"1–2 formulär (t.ex. kontakt + offert)",
			"Enkel nyhets‑/bloggsida",
			"SEO‑genomgång för alla sidor",
			"3 revisionsrundor",
			"Publicering och genomgång (45 min)",
			"Personlig kontakt",
		],
		cta: "Beställ",
	},
	{
		id: "stor",
		name: "Hemsida Stor (Komplett)",
		price: "10 000 kr",
		color: "emerald",
		features: [
			"För mer innehåll och lite extra funktion.",
			"8–15 undersidor",
			"Mobilanpassad/Responsiv design",
			"Byggt med modern webbutveckling för snabb laddning och enkel vidareutveckling",
			"Inläggning av dina texter (upp till 3 500 ord)",
			"Bildhjälp: upp till 15 bilder",
			"Upp till 3 formulär (t.ex. kontakt, offert, intresseanmälan)",
			"Nyheter/Blogg med kategorier",
			"Utökad SEO (struktur, internlänkar, delningsbilder)",
			"4 revisionsrundor",
			"Publicering och genomgång (60 min)",
			"Personlig kontakt",
		],
		cta: "Beställ",
	},
];

const monthlyTiers: Tier[] = [
	{
		id: "mini",
		name: "Månad Mini",
		price: "299:-",
		period: "/mån",
		color: "rose",
		features: ["Hosting", "Support", "Uppdateringar"],
		cta: "Välj",
	},
	{
		id: "standard",
		name: "Månad Standard",
		price: "499:-",
		period: "/mån",
		color: "indigo",
		features: ["Hosting", "Support", "Uppdateringar", "Backup"],
		cta: "Välj",
	},
	{
		id: "pro",
		name: "Månad Pro",
		price: "799:-",
		period: "/mån",
		color: "emerald",
		features: [
			"Hosting",
			"Support",
			"Uppdateringar",
			"Backup",
			"Prestanda‑optimering",
		],
		cta: "Välj",
	},
];

function TierCard({ tier }: { tier: Tier }) {
	const colorMap: Record<Tier["color"], string> = {
		rose: "bg-rose-600",
		violet: "bg-violet-600",
		emerald: "bg-emerald-600",
		sky: "bg-sky-600",
		amber: "bg-amber-600",
		fuchsia: "bg-fuchsia-600",
		indigo: "bg-indigo-600",
	};

	return (
		<div className="group flex h-full flex-col rounded-2xl border border-black/10 bg-white/80 backdrop-blur shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
			<div className={`relative overflow-hidden rounded-t-2xl ${colorMap[tier.color]} text-white`}>
				<div className="absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_0%_0%,white,transparent_60%)]" aria-hidden />
				<div className="relative px-6 py-4 flex h-40 flex-col justify-between">
					<div className="text-sm/5 opacity-90">Komplett paket</div>
					<h3 className="text-xl font-semibold truncate" title={tier.name}>{tier.name}</h3>
					<div>
						<div className="text-3xl font-extrabold">
							{tier.price}
							{tier.period && <span className="text-sm font-medium opacity-90"> {tier.period}</span>}
						</div>
						<div className="text-xs opacity-90">{tier.period ? "Månadspris" : "Engångskostnad"}</div>
					</div>
				</div>
			</div>

			<ul className="flex flex-1 flex-col gap-3 px-6 py-5 text-black/80">
				{tier.features.map((f, i) => (
					<li key={i} className="flex items-start gap-2">
						<span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</span>
						<span>{f}</span>
					</li>
				))}
			</ul>

			<div className="px-6 pb-6">
				<a
					href="/kontakt"
					className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-medium text-white ${colorMap[tier.color]} shadow-sm hover:opacity-95`}
				>
					{tier.cta}
				</a>
			</div>
		</div>
	);
}

export default function PriceContent() {
	const [mode, setMode] = useState<"hemsida" | "manad">("hemsida");

	return (
		<main className="min-h-screen w-full">
			<section className="mx-auto max-w-7xl px-6 pt-24 md:pt-28 pb-16">
				<h1 className="text-4xl md:text-5xl font-semibold leading-tight">Priser</h1>

				{/* Toggle */}
				<div className="mt-6 inline-flex rounded-full border border-black/10 bg-white/70 p-1 backdrop-blur shadow-sm">
					<button
						type="button"
						onClick={() => setMode("hemsida")}
						className={`px-4 py-2 text-sm font-medium rounded-full transition ${
							mode === "hemsida" ? "bg-black text-white" : "text-black/70 hover:text-black"
						}`}
						aria-pressed={mode === "hemsida"}
					>
						Hemsida
					</button>
					<button
						type="button"
						onClick={() => setMode("manad")}
						className={`px-4 py-2 text-sm font-medium rounded-full transition ${
							mode === "manad" ? "bg-black text-white" : "text-black/70 hover:text-black"
						}`}
						aria-pressed={mode === "manad"}
					>
						Månad
					</button>
				</div>

				{/* Grids */}
				{mode === "hemsida" ? (
					<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
						{oneTimeTiers.map((t) => (
							<TierCard key={t.id} tier={t} />
						))}
					</div>
				) : (
					<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{monthlyTiers.map((t) => (
							<TierCard key={t.id} tier={t} />
						))}
					</div>
				)}
			</section>
		</main>
	);
}

