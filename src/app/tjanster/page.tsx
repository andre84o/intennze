import type { Metadata } from "next";
import { cookies } from "next/headers";
import PriceContent from "../components/PriceContent";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "Services | Websites and digital solutions | Intenzze",
        description:
          "Intenzze builds business websites, booking systems, customer portals, payment solutions and integrations for businesses.",
        alternates: { canonical: "/tjanster" },
      }
    : {
        title: "Tjänster | Hemsidor och digitala lösningar | Intenzze",
        description:
          "Intenzze bygger företagshemsidor, bokningssystem, kundportaler, betalningslösningar och integrationer för företag.",
        alternates: { canonical: "/tjanster" },
      };
}

export default async function ServicesPage() {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  const base = "https://www.intenzze.com";
  const en = lang === "en";

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Intenzze",
    url: base,
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: en
      ? "Web development and digital solutions"
      : "Webbutveckling och digitala lösningar",
    description: en
      ? "Business websites, booking systems, customer portals, payment solutions, integrations, technical operations and support."
      : "Företagshemsidor, bokningssystem, kundportaler, betalningslösningar, integrationer samt teknisk drift och support.",
    provider: { "@type": "Organization", name: "Intenzze", url: base },
    url: `${base}/tjanster`,
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: en ? "Home" : "Start", item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: en ? "Services" : "Tjänster",
        item: `${base}/tjanster`,
      },
    ],
  };

  return (
    <>
      <PriceContent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  );
}
