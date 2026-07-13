import type { Metadata } from "next";
import { cookies } from "next/headers";
import AboutContent from "../components/AboutContent";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "About Intenzze | Personal web studio for businesses",
        description:
          "Learn more about Intenzze and André Torabpour. We build modern business websites, booking systems and digital solutions with personal contact and a clear scope.",
        alternates: { canonical: "/om-oss" },
      }
    : {
        title: "Om Intenzze | Personlig webbstudio för företag",
        description:
          "Lär känna Intenzze och André Torabpour. Vi bygger moderna företagshemsidor, bokningssystem och digitala lösningar med personlig kontakt och tydlig omfattning.",
        alternates: { canonical: "/om-oss" },
      };
}

export default async function AboutPage() {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  const base = "https://www.intenzze.com";
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: lang === "en" ? "About Intenzze" : "Om Intenzze",
    description:
      lang === "en"
        ? "Learn more about Intenzze, a personal web studio that builds websites and digital solutions for businesses."
        : "Lär känna Intenzze, en personlig webbstudio som bygger hemsidor och digitala lösningar för företag.",
    url: `${base}/om-oss`,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "Start", item: base },
      { "@type": "ListItem", position: 2, name: lang === "en" ? "About us" : "Om oss", item: `${base}/om-oss` },
    ],
  };
  return (
    <>
      <AboutContent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  );
}