"use client";
import { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

type Tier = {
  id: string;
  name: string;
  price: string;
  period?: string;
  color: "rose" | "violet" | "emerald" | "sky" | "amber" | "fuchsia" | "indigo";
  features: string[];
  cta: string;
};

function TierCard({ tier, packageLabel, priceLabel }: { tier: Tier; packageLabel: string; priceLabel: string }) {
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
          <div className="text-sm/5 opacity-90">{packageLabel}</div>
					<h3 className="text-xl font-semibold truncate" title={tier.name}>{tier.name}</h3>
					<div>
						<div className="text-3xl font-extrabold">
							{tier.price}
							{tier.period && <span className="text-sm font-medium opacity-90"> {tier.period}</span>}
						</div>
            <div className="text-xs opacity-90">{priceLabel}</div>
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
  const { lang } = useLanguage();
  const t = (k: string) => dict[lang][k];
  const [mode, setMode] = useState<"hemsida" | "manad">("hemsida");

  // Build tiers per language
  const oneTimeTiers: Tier[] = lang === "sv" ? [
    {
      id: "budget",
      name: t("tier_name_budget"),
      price: "2 000 kr",
      color: "amber",
      features: [
        "Beskrivning: Kom igång billigt",
        "Undersidor: 1 undersida (ram och layout)",
        "Design: Enkel, ren design (en färgpalett och typsnitt)",
        "Innehållstexter: Platshållartexter",
        "Bilder: Platshållarbilder",
        "Sociala medier",
        "Revisionsrundor: 1 samlad Online",
        "Förhandsvisning: Online",
        "Ändringar efter önskemål",
        "Publicering och genomgång",
      ],
      cta: t("pricing_cta_onetime"),
    },
    {
      id: "liten",
      name: t("tier_name_small"),
      price: "5 000 kr",
      color: "rose",
      features: [
        "Undersidor: 1–3",
        "Anpassad design",
        "Modern webbutveckling",
        "Responsiv design",
        "Inläggning av dina texter",
        "Bildhjälp upp till 6 royaltyfria bilder",
        "1 kontaktformulär",
        "Google Maps",
        "Grundläggande SEO",
        "Koppling till sociala medier: 2 kanaler",
        "Revisionsrundor: 2 rundor",
        "Ändringar efter önskemål",
        "Publicering och genomgång: 30 min",
        "Personlig kontakt",
      ],
      cta: t("pricing_cta_onetime"),
    },
    {
      id: "mellan",
      name: t("tier_name_medium"),
      price: "7 000 kr",
      color: "indigo",
      features: [
        "Undersidor: 4–7",
        "Anpassad design",
        "Modern webbutveckling",
        "Responsiv design",
        "Inläggning av dina texter",
        "Bildhjälp upp till 10 bilder",
        "Upp till 2 kontaktformulär",
        "Google Maps",
        "SEO genomgång för alla sidor",
        "Koppling till sociala medier",
        "Blogg, inlägg, nyheter",
        "Revisionsrundor: 3 rundor",
        "Ändringar efter önskemål",
        "Publicering och genomgång: 45 min",
        "Personlig kontakt",
      ],
      cta: t("pricing_cta_onetime"),
    },
    {
      id: "stor",
      name: t("tier_name_large"),
      price: "10 000 kr",
      color: "emerald",
      features: [
        "Undersidor: 8–15",
        "Anpassad design",
        "Modern webbutveckling",
        "Responsiv design",
        "Inläggning av dina texter",
        "Bildhjälp upp till 15 bilder",
        "Upp till 3 kontaktformulär",
        "Google Maps",
        "Blogg, inlägg, nyheter",
        "Utökad SEO (struktur, internlänkar, delningsbilder)",
        "Koppling till sociala medier",
        "Revisionsrundor: 4 rundor",
        "Ändringar efter önskemål",
        "Publicering och genomgång: 60 min",
        "Personlig kontakt",
      ],
      cta: t("pricing_cta_onetime"),
    },
  ] : [
    {
      id: "budget",
      name: t("tier_name_budget"),
      price: "2 000 kr",
      color: "amber",
      features: [
        "Description: Get started affordably",
        "Subpages: 1 subpage (frame and layout)",
        "Design: Simple, clean design (one color palette and font)",
        "Content: Placeholder texts",
        "Images: Placeholder images",
        "Social media",
        "Revision rounds: 1 consolidated online",
        "Preview: Online",
        "Changes on request",
        "Publishing and walkthrough",
      ],
      cta: t("pricing_cta_onetime"),
    },
    {
      id: "liten",
      name: t("tier_name_small"),
      price: "5 000 kr",
      color: "rose",
      features: [
        "Subpages: 1–3",
        "Custom design",
        "Modern web development",
        "Responsive design",
        "Input of your texts",
        "Image assistance up to 6 royalty-free images",
        "1 contact form",
        "Google Maps",
        "Basic SEO",
        "Social media linking: 2 channels",
        "Revision rounds: 2 rounds",
        "Changes on request",
        "Publishing and walkthrough: 30 min",
        "Personal contact",
      ],
      cta: t("pricing_cta_onetime"),
    },
    {
      id: "mellan",
      name: t("tier_name_medium"),
      price: "7 000 kr",
      color: "indigo",
      features: [
        "Subpages: 4–7",
        "Custom design",
        "Modern web development",
        "Responsive design",
        "Input of your texts",
        "Image assistance up to 10 images",
        "Up to 2 contact forms",
        "Google Maps",
        "SEO review for all pages",
        "Social media linking",
        "Blog, posts, news",
        "Revision rounds: 3 rounds",
        "Changes on request",
        "Publishing and walkthrough: 45 min",
        "Personal contact",
      ],
      cta: t("pricing_cta_onetime"),
    },
    {
      id: "stor",
      name: t("tier_name_large"),
      price: "10 000 kr",
      color: "emerald",
      features: [
        "Subpages: 8–15",
        "Custom design",
        "Modern web development",
        "Responsive design",
        "Input of your texts",
        "Image assistance up to 15 images",
        "Up to 3 contact forms",
        "Google Maps",
        "Blog, posts, news",
        "Extended SEO (structure, internal links, share images)",
        "Social media linking",
        "Revision rounds: 4 rounds",
        "Changes on request",
        "Publishing and walkthrough: 60 min",
        "Personal contact",
      ],
      cta: t("pricing_cta_onetime"),
    },
  ];

  const monthlyTiers: Tier[] = lang === "sv" ? [
    {
      id: "liten-m",
      name: t("tier_name_small"),
      price: "795 kr",
      period: "/mån",
      color: "rose",
      features: [
        "Bindningstid: 12 månader",
        "Startkostnad: Ingen",
        "Webbhotell",
        // Mirror one-time 'liten'
        "Undersidor: 1–3",
        "Anpassad design",
        "Modern webbutveckling",
        "Responsiv design",
        "Inläggning av dina texter",
        "Bildhjälp upp till 6 royaltyfria bilder",
        "1 kontaktformulär",
        "Google Maps",
        "Grundläggande SEO",
        "Koppling till sociala medier: 2 kanaler",
        "Revisionsrundor: 2 rundor",
        "Ändringar efter önskemål",
        "Publicering och genomgång: 30 min",
        "Personlig kontakt",
        "Serviceavtal",
      ],
      cta: t("pricing_cta_monthly"),
    },
    {
      id: "mellan-m",
      name: t("tier_name_medium"),
      price: "995 kr",
      period: "/mån",
      color: "indigo",
      features: [
        "Bindningstid: 12 månader",
        "Startkostnad: Ingen",
        "Webbhotell",
        // Mirror one-time 'mellan'
        "Undersidor: 4–7",
        "Anpassad design",
        "Modern webbutveckling",
        "Responsiv design",
        "Inläggning av dina texter",
        "Bildhjälp upp till 10 bilder",
        "Upp till 2 kontaktformulär",
        "Google Maps",
        "SEO genomgång för alla sidor",
        "Koppling till sociala medier",
        "Blogg, inlägg, nyheter",
        "Revisionsrundor: 3 rundor",
        "Ändringar efter önskemål",
        "Publicering och genomgång: 45 min",
        "Personlig kontakt",
        "Serviceavtal",
      ],
      cta: t("pricing_cta_monthly"),
    },
    {
      id: "stor-m",
      name: t("tier_name_large"),
      price: "1295 kr",
      period: "/mån",
      color: "emerald",
      features: [
        "Bindningstid: 12 månader",
        "Startkostnad: Ingen",
        "Webbhotell",
        // Mirror one-time 'stor'
        "Undersidor: 8–15",
        "Anpassad design",
        "Modern webbutveckling",
        "Responsiv design",
        "Inläggning av dina texter",
        "Bildhjälp upp till 15 bilder",
        "Upp till 3 kontaktformulär",
        "Google Maps",
        "Blogg, inlägg, nyheter",
        "Utökad SEO (struktur, internlänkar, delningsbilder)",
        "Koppling till sociala medier",
        "Revisionsrundor: 4 rundor",
        "Ändringar efter önskemål",
        "Publicering och genomgång: 60 min",
        "Personlig kontakt",
        "Serviceavtal",
      ],
      cta: t("pricing_cta_monthly"),
    },
  ] : [
    {
      id: "liten-m",
      name: t("tier_name_small"),
      price: "795 kr",
      period: "/mo",
      color: "rose",
      features: [
        "Commitment period: 12 months",
        "Start-up cost: None",
        "Web hosting",
        // Mirror one-time 'small'
        "Subpages: 1–3",
        "Custom design",
        "Modern web development",
        "Responsive design",
        "Input of your texts",
        "Image assistance up to 6 royalty-free images",
        "1 contact form",
        "Google Maps",
        "Basic SEO",
        "Social media linking: 2 channels",
        "Revision rounds: 2 rounds",
        "Changes on request",
        "Publishing and walkthrough: 30 min",
        "Personal contact",
        "Service agreement",
      ],
      cta: t("pricing_cta_monthly"),
    },
    {
      id: "mellan-m",
      name: t("tier_name_medium"),
      price: "995 kr",
      period: "/mo",
      color: "indigo",
      features: [
        "Commitment period: 12 months",
        "Start-up cost: None",
        "Web hosting",
        // Mirror one-time 'medium'
        "Subpages: 4–7",
        "Custom design",
        "Modern web development",
        "Responsive design",
        "Input of your texts",
        "Image assistance up to 10 images",
        "Up to 2 contact forms",
        "Google Maps",
        "SEO review for all pages",
        "Social media linking",
        "Blog, posts, news",
        "Revision rounds: 3 rounds",
        "Changes on request",
        "Publishing and walkthrough: 45 min",
        "Personal contact",
        "Service agreement",
      ],
      cta: t("pricing_cta_monthly"),
    },
    {
      id: "stor-m",
      name: t("tier_name_large"),
      price: "1295 kr",
      period: "/mo",
      color: "emerald",
      features: [
        "Commitment period: 12 months",
        "Start-up cost: None",
        "Web hosting",
        // Mirror one-time 'large'
        "Subpages: 8–15",
        "Custom design",
        "Modern web development",
        "Responsive design",
        "Input of your texts",
        "Image assistance up to 15 images",
        "Up to 3 contact forms",
        "Google Maps",
        "Blog, posts, news",
        "Extended SEO (structure, internal links, share images)",
        "Social media linking",
        "Revision rounds: 4 rounds",
        "Changes on request",
        "Publishing and walkthrough: 60 min",
        "Personal contact",
        "Service agreement",
      ],
      cta: t("pricing_cta_monthly"),
    },
  ];

	return (
		<main className="min-h-screen w-full">
			<section className="mx-auto max-w-7xl px-6 pt-24 md:pt-28 pb-16">
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight">{t("pricing_title")}</h1>

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
            {t("pricing_toggle_onetime")}
					</button>
					<button
						type="button"
						onClick={() => setMode("manad")}
						className={`px-4 py-2 text-sm font-medium rounded-full transition ${
							mode === "manad" ? "bg-black text-white" : "text-black/70 hover:text-black"
						}`}
						aria-pressed={mode === "manad"}
					>
            {t("pricing_toggle_monthly")}
					</button>
				</div>

            {/* Notice */}
            <p className="mt-4 mx-auto max-w-4xl text-center text-xs md:text-sm text-black/70">
              <span className="font-medium">{t("pricing_notice_prefix")}</span>
              {` ${t("pricing_notice_text")}`}
            </p>

				{/* Grids */}
        {mode === "hemsida" ? (
					<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {oneTimeTiers.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                packageLabel={t("pricing_package_label")}
                priceLabel={tier.period ? t("pricing_monthly_label") : t("pricing_onetime_label")}
              />
						))}
					</div>
				) : (
					<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {monthlyTiers.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                packageLabel={t("pricing_package_label")}
                priceLabel={tier.period ? t("pricing_monthly_label") : t("pricing_onetime_label")}
              />
						))}
					</div>
				)}
			</section>
		</main>
	);
}

