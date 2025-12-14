import type { Metadata } from "next";
import { cookies } from "next/headers";
import PriceContent from "../components/PriceContent";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "Services",
        description: "Web development services — websites, design and digital solutions.",
        alternates: { canonical: "/tjanster" },
      }
    : {
        title: "Tjänster",
        description: "Webbutveckling och digitala lösningar — hemsidor, design och mer.",
        alternates: { canonical: "/tjanster" },
      };
}

export default async function ServicesPage() {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  const base = "https://intenzze.com";
  const currency = "SEK";

  const tiers = {
    sv: {
      labels: { budget: "Hemsida Budget", small: "Hemsida Liten", medium: "Hemsida Mellan", large: "Hemsida Stor" },
      oneTime: {
        budget: { price: 2000, sku: "WEB-BUDGET" },
        small: { price: 5000, sku: "WEB-LITEN" },
        medium: { price: 7000, sku: "WEB-MELLAN" },
        large: { price: 10000, sku: "WEB-STOR" },
      },
      monthly: {
        small: { price: 795, sku: "WEB-LITEN-M" },
        medium: { price: 995, sku: "WEB-MELLAN-M" },
        large: { price: 1295, sku: "WEB-STOR-M" },
      },
      serviceName: "Webbutveckling och hemsidor",
      catalogName: "Hemsida – engångskostnad",
      breadcrumbs: ["Start", "Tjänster"],
      descriptions: {
        budget: "Kom igång prisvärt med 1 undersida, enkel design och platshållarinnehåll.",
        small: "1–3 undersidor, anpassad design, responsiv och SEO grundläggande.",
        medium: "4–7 undersidor, blogg/nyheter, utökad SEO och flera formulär.",
        large: "8–15 undersidor, avancerad SEO, fler formulär och full genomgång.",
      },
    },
    en: {
      labels: { budget: "Website Budget", small: "Website Small", medium: "Website Medium", large: "Website Large" },
      oneTime: {
        budget: { price: 2000, sku: "WEB-BUDGET" },
        small: { price: 5000, sku: "WEB-SMALL" },
        medium: { price: 7000, sku: "WEB-MEDIUM" },
        large: { price: 10000, sku: "WEB-LARGE" },
      },
      monthly: {
        small: { price: 795, sku: "WEB-SMALL-M" },
        medium: { price: 995, sku: "WEB-MEDIUM-M" },
        large: { price: 1295, sku: "WEB-LARGE-M" },
      },
      serviceName: "Web development and websites",
      catalogName: "Website — one-time cost",
      breadcrumbs: ["Home", "Services"],
      descriptions: {
        budget: "Get started affordably with 1 subpage, simple design and placeholder content.",
        small: "1–3 subpages, custom design, responsive and basic SEO.",
        medium: "4–7 subpages, blog/news, extended SEO and multiple forms.",
        large: "8–15 subpages, advanced SEO, more forms and thorough walkthrough.",
      },
    },
  } as const;

  const t = tiers[lang];

  // Product + Offer JSON-LD per tier (one-time)
  const products = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: t.labels.budget,
      sku: t.oneTime.budget.sku,
      description: t.descriptions.budget,
      brand: { "@type": "Organization", name: "intenzze" },
      offers: { "@type": "Offer", price: t.oneTime.budget.price, priceCurrency: currency, url: `${base}/tjanster#budget` },
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: t.labels.small,
      sku: t.oneTime.small.sku,
      description: t.descriptions.small,
      brand: { "@type": "Organization", name: "intenzze" },
      offers: { "@type": "Offer", price: t.oneTime.small.price, priceCurrency: currency, url: `${base}/tjanster#liten` },
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: t.labels.medium,
      sku: t.oneTime.medium.sku,
      description: t.descriptions.medium,
      brand: { "@type": "Organization", name: "intenzze" },
      offers: { "@type": "Offer", price: t.oneTime.medium.price, priceCurrency: currency, url: `${base}/tjanster#mellan` },
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: t.labels.large,
      sku: t.oneTime.large.sku,
      description: t.descriptions.large,
      brand: { "@type": "Organization", name: "intenzze" },
      offers: { "@type": "Offer", price: t.oneTime.large.price, priceCurrency: currency, url: `${base}/tjanster#stor` },
    },
  ];

  // Monthly offers as Products with UnitPriceSpecification
  const monthlyProducts = ["small", "medium", "large"].map((key) => {
    const k = key as "small" | "medium" | "large";
    const meta = t.monthly[k];
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: t.labels[k],
      sku: meta.sku,
      description: t.descriptions[k],
      brand: { "@type": "Organization", name: "intenzze" },
      offers: {
        "@type": "Offer",
        price: meta.price,
        priceCurrency: currency,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: meta.price,
          priceCurrency: currency,
          unitCode: "MON",
        },
        url: `${base}/tjanster#${k}-m`,
      },
    };
  });

  // Service + OfferCatalog wrapper
  const servicesLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t.serviceName,
    provider: { "@type": "Organization", name: "intenzze", url: base },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: t.catalogName,
      itemListElement: [
        { "@type": "Offer", name: t.labels.budget, price: `${t.oneTime.budget.price}`, priceCurrency: currency },
        { "@type": "Offer", name: t.labels.small, price: `${t.oneTime.small.price}`, priceCurrency: currency },
        { "@type": "Offer", name: t.labels.medium, price: `${t.oneTime.medium.price}`, priceCurrency: currency },
        { "@type": "Offer", name: t.labels.large, price: `${t.oneTime.large.price}`, priceCurrency: currency },
      ],
    },
  } as const;

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.breadcrumbs[0], item: base },
      { "@type": "ListItem", position: 2, name: t.breadcrumbs[1], item: `${base}/tjanster` },
    ],
  } as const;

  return (
    <>
      <PriceContent />
      {/* Product + Offer JSON-LD per tier (one-time) */}
      {products.map((p, i) => (
        <script key={`p-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(p) }} />
      ))}
      {/* Monthly Products */}
      {monthlyProducts.map((p, i) => (
        <script key={`pm-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(p) }} />
      ))}
      {/* Service wrapper */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  );
}
